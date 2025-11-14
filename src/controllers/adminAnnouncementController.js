// controllers/announcementAdminController.js
import {
  getActiveByPosition,
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  deactivateOtherAnnouncements,
  getAnnouncementById,
} from "../models/announcementModel.js";
import { uploadToMedia } from "../utils/uploadToMedia.js";

// --- helpers ---
function toBool(v, fallback = true) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  if (typeof v === "number") return v !== 0;
  return fallback;
}
function toNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePayload(body, { partial = false } = {}) {
  const payload = {
    active:
      body.active != null
        ? toBool(body.active, true)
        : partial
        ? undefined
        : true,
    icon: body.icon ?? (partial ? undefined : "Megaphone"),
    name:
      body.name != null ? String(body.name).trim() : partial ? undefined : "",
    description: body.description ?? (partial ? undefined : null),
    icon_size:
      body.icon_size != null
        ? toNum(body.icon_size, 20)
        : partial
        ? undefined
        : 20,
    position: body.position ?? (partial ? undefined : "left"),
    start_at: body.start_at ?? (partial ? undefined : new Date().toISOString()),
    end_at: body.end_at ?? (partial ? undefined : null),
    image: body.image ?? (partial ? undefined : null),
    image_size:
      body.image_size != null
        ? toNum(body.image_size, 24)
        : partial
        ? undefined
        : 24,

    // 🔹 NEW: icon_color
    icon_color: body.icon_color ?? (partial ? undefined : null),
  };

  // required checks (only when not partial)
  if (!partial) {
    if (!payload.name) throw new Error("name is required");
    if (!["left", "right"].includes(payload.position)) {
      throw new Error("position must be 'left' or 'right'");
    }
  } else {
    // if provided in partial, still validate position value
    if (
      payload.position !== undefined &&
      !["left", "right"].includes(payload.position)
    ) {
      throw new Error("position must be 'left' or 'right'");
    }
  }

  // remove undefined keys in partial mode
  if (partial) {
    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k]
    );
  }

  return payload;
}

// ===== PUBLIC =====
export const getAnnouncementPublic = async (req, res) => {
  try {
    const position = (req.query.position || "").toLowerCase();
    if (!["left", "right"].includes(position)) {
      return res.status(400).json({ error: "Invalid position" });
    }
    const item = await getActiveByPosition(position);
    return res.json(item);
  } catch (err) {
    console.error("getAnnouncementPublic error:", err.message);
    return res.status(500).json({ error: "Failed to fetch announcement" });
  }
};

// ===== ADMIN =====

/** GET /admin/announcements */
export const adminListAnnouncements = async (req, res) => {
  try {
    const { q, position, active, from, to, page, pageSize } = req.query;
    const parsedActive =
      typeof active === "string" ? active === "true" : undefined;

    const result = await listAnnouncements({
      q,
      position,
      active: parsedActive,
      from,
      to,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });

    // frontend expects { data: [...] }
    return res.json(result);
  } catch (err) {
    console.error("adminListAnnouncements error:", err.message);
    return res.status(500).json({ error: "Failed to list announcements" });
  }
};

/** POST /admin/announcements  (supports multipart image) */
export const adminCreateAnnouncement = async (req, res) => {
  try {
    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    if (!parsed.name) {
      return res.status(400).json({ error: "Missing required field: name" });
    }

    const token = req.headers.authorization?.split(" ")[1] || null;

    const imgUrl = await uploadToMedia({
      file: req.files?.["image"]?.[0],
      path: "announcements",
      folderName: parsed.name?.replace(/\s+/g, "_") || "announcement",
      token,
    });

    const payload = {
      active: parsed.active ?? true,
      icon: parsed.icon ?? "Megaphone",
      name: parsed.name,
      description: parsed.description || null,
      icon_size: Number(parsed.icon_size) || 20,
      position: parsed.position || "left",
      start_at: parsed.start_at || new Date().toISOString(),
      end_at: parsed.end_at || null,
      image: imgUrl || parsed.image || null,
      image_size: Number(parsed.image_size) || 24,

      // 🔹 NEW
      icon_color: parsed.icon_color || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await createAnnouncement(payload);
    if (error) throw error;

    // 🔥 Kalau announcement ini aktif → nonaktifkan semua yg lain di posisi sama
    if (payload.active) {
      await deactivateOtherAnnouncements(payload.position, data.id);
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("💥 adminCreateAnnouncement error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/** PUT /admin/announcements/:id  (full update; supports new image) */
export const adminUpdateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.split(" ")[1] || null;

    // full update requires all required fields
    const payload = normalizePayload({ ...req.body }, { partial: false });

    let uploadedUrl = null;
    if (req.files?.image?.[0]) {
      uploadedUrl = await uploadToMedia({
        file: req.files.image[0],
        path: "announcements",
        folderName: (payload.name || "announcement").replace(/\s+/g, "_"),
        token,
      });
    }

    const updated = await updateAnnouncement(id, {
      ...payload,
      image: uploadedUrl ?? payload.image ?? null,
    });

    // 🔥 Kalau setelah update dia aktif → nonaktifkan semua yang lain di posisi sama
    if (updated?.active) {
      await deactivateOtherAnnouncements(updated.position, updated.id);
    }

    return res.json(updated);
  } catch (err) {
    console.error("adminUpdateAnnouncement error:", err.message);
    return res.status(400).json({ error: err.message });
  }
};

/** PATCH /admin/announcements/:id/toggle  (active only) */
export const adminToggleAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const active =
      typeof req.body.active === "boolean"
        ? req.body.active
        : req.body.active === "true";

    // ambil dulu buat tahu position
    const existing = await getAnnouncementById(id);
    if (!existing) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    const updated = await updateAnnouncement(id, { active });

    // 🔥 kalau di-set active = true → matikan semua yg lain di posisi sama
    if (active && updated?.position) {
      await deactivateOtherAnnouncements(updated.position, id);
    }

    return res.json(updated);
  } catch (err) {
    console.error("adminToggleAnnouncement error:", err.message);
    return res.status(400).json({ error: err.message });
  }
};

/** DELETE /admin/announcements/:id */
export const adminDeleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteAnnouncement(id);
    return res.json({ success: true });
  } catch (err) {
    console.error("adminDeleteAnnouncement error:", err.message);
    return res.status(400).json({ error: err.message });
  }
};
