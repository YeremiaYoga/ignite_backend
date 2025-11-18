// controllers/adminWorldController.js
import {
  getWorlds,
  getWorldById,
  createWorld,
  updateWorld,
  deleteWorld,
} from "../models/worldModel.js";
import { uploadToMedia } from "../utils/uploadToMedia.js";
import { deleteMediaFile } from "../utils/deleteMediaFile.js";

// helper slug sederhana buat folderName
function slugifyName(name = "") {
  return (
    name
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "world"
  );
}

// GET /admin/worlds
export const listWorldsAdmin = async (req, res) => {
  try {
    const worlds = await getWorlds();
    res.json({
      success: true,
      data: worlds,
    });
  } catch (err) {
    console.error("💥 listWorldsAdmin error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch worlds" });
  }
};

// GET /admin/worlds/:id
export const getWorldAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const world = await getWorldById(id);

    if (!world) {
      return res.status(404).json({ success: false, error: "World not found" });
    }

    res.json({ success: true, data: world });
  } catch (err) {
    if (err.code === "PGRST116") {
      return res.status(404).json({ success: false, error: "World not found" });
    }
    console.error("💥 getWorldAdmin error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch world" });
  }
};

// POST /admin/worlds
export const addWorldAdmin = async (req, res) => {
  try {
    console.log("🧩 [addWorldAdmin] raw body:", req.body);
    console.log("🧩 [addWorldAdmin] raw files:", req.files);

    const rawBody = req.body || {};

    const parsed =
      typeof rawBody.data === "string" ? JSON.parse(rawBody.data) : rawBody;

    if (!parsed.name) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required field: name" });
    }

    const folderName = slugifyName(parsed.name);
    const token = req.headers.authorization?.split(" ")[1] || null;

    // upload icon & banner to ignite-media
    const iconUrl = await uploadToMedia({
      file: req.files?.["icon"]?.[0],
      path: "worlds",
      folderName,
      token,
    });

    const bannerUrl = await uploadToMedia({
      file: req.files?.["banner"]?.[0],
      path: "worlds",
      folderName,
      token,
    });

    const allowedFields = [
      "name",
      "short_name",
      "private",
      "heralds",
      "icon",
      "banner",
      "platforms",
      "game_systems",
      "languages",
    ];

    const baseWorld = {
      ...parsed,
      icon: iconUrl || parsed.icon || null,
      banner: bannerUrl || parsed.banner || null,
      private:
        parsed.private === true ||
        parsed.private === "true" ||
        parsed.private === 1,
      heralds: true, // admin = always heralds
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms : [],
      game_systems: Array.isArray(parsed.game_systems) ? parsed.game_systems : [],
      languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    };

    const cleanData = Object.fromEntries(
      Object.entries(baseWorld).filter(([k]) => allowedFields.includes(k))
    );

    const world = await createWorld(cleanData);

    res.status(201).json({
      success: true,
      message: "✅ World created successfully",
      data: world,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "world_id or public_id already exists",
        detail: err.message,
      });
    }

    console.error("💥 addWorldAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /admin/worlds/:id
export const editWorldAdmin = async (req, res) => {
  try {
    console.log("🛠 [ADMIN] editWorldAdmin invoked");
    const { id } = req.params;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    // 1️⃣ Ambil existing world
    let existing;
    try {
      existing = await getWorldById(id);
    } catch (err) {
      if (err.code === "PGRST116") {
        console.warn("⚠️ World not found for update:", id);
        return res
          .status(404)
          .json({ success: false, error: "World not found" });
      }
      throw err;
    }

    if (!existing) {
      console.warn("⚠️ World not found for update:", id);
      return res.status(404).json({ success: false, error: "World not found" });
    }

    // 2️⃣ Parse body (support multipart/form-data)
    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    // 3️⃣ Folder name untuk media (berdasarkan name baru atau lama)
    const folderName = slugifyName(parsed.name || existing.name);

    // 4️⃣ Ambil token sekali
    const token =
      req.cookies?.ignite_access_token ||
      req.user?.jwt?.token ||
      req.headers.authorization?.split(" ")[1] ||
      null;

    const files = req.files || {};

    // 5️⃣ Handle ICON
    let iconPath = existing.icon || null;
    if (files["icon"] && files["icon"][0]) {
      const newUrl = await uploadToMedia({
        file: files["icon"][0],
        path: "worlds",
        folderName,
        token,
        mediaUrl: MEDIA_URL,
      });

      if (newUrl) {
        // hapus icon lama kalau beda
        if (existing.icon && existing.icon !== newUrl) {
          await deleteMediaFile(existing.icon, MEDIA_URL, token);
        }
        iconPath = newUrl;
      }
    }

    // 6️⃣ Handle BANNER
    let bannerPath = existing.banner || null;
    if (files["banner"] && files["banner"][0]) {
      const newUrl = await uploadToMedia({
        file: files["banner"][0],
        path: "worlds",
        folderName,
        token,
        mediaUrl: MEDIA_URL,
      });

      if (newUrl) {
        // hapus banner lama kalau beda
        if (existing.banner && existing.banner !== newUrl) {
          await deleteMediaFile(existing.banner, MEDIA_URL, token);
        }
        bannerPath = newUrl;
      }
    }

    // 7️⃣ Bersihkan field yang TIDAK boleh diubah client
    const forbiddenFields = [
      "id",
      "world_id",
      "public_id",
      "created_at",
      "updated_at",
    ];
    forbiddenFields.forEach((f) => delete parsed[f]);

    // 8️⃣ Normalisasi boolean
    const privateValue =
      parsed.private !== undefined
        ? parsed.private === true ||
          parsed.private === "true" ||
          parsed.private === 1
        : existing.private;

    const heraldsValue = true;

    // 9️⃣ Build final payload
    const updatedData = {
      ...existing,
      ...parsed,
      icon: iconPath ?? parsed.icon ?? existing.icon ?? null,
      banner: bannerPath ?? parsed.banner ?? existing.banner ?? null,
      private: privateValue,
      heralds: heraldsValue,
      world_id: existing.world_id, // lock
      public_id: existing.public_id, // lock
      updated_at: new Date().toISOString(),
    };

    // 🔟 Update ke DB
    const result = await updateWorld(id, updatedData);

    console.log("✅ World updated:", result?.id, result?.name);
    res.json({
      success: true,
      message: "✅ World updated successfully",
      data: result,
    });
  } catch (err) {
    console.error("💥 editWorldAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /admin/worlds/:id
export const deleteWorldAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    // 1️⃣ Ambil world dulu
    let existing;
    try {
      existing = await getWorldById(id);
    } catch (err) {
      if (err.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "World not found" });
      }
      throw err;
    }

    if (!existing) {
      return res.status(404).json({ success: false, error: "World not found" });
    }

    // 2️⃣ Ambil token sekali (sama seperti edit)
    const token =
      req.cookies?.ignite_access_token ||
      req.user?.jwt?.token ||
      req.headers.authorization?.split(" ")[1] ||
      null;

    // 3️⃣ Hapus media (best effort)
    const tasks = [];

    if (existing.icon) {
      tasks.push(
        deleteMediaFile(existing.icon, MEDIA_URL, token).catch((err) => {
          console.warn("⚠️ Failed to delete world icon:", err?.message || err);
        })
      );
    }

    if (existing.banner) {
      tasks.push(
        deleteMediaFile(existing.banner, MEDIA_URL, token).catch((err) => {
          console.warn(
            "⚠️ Failed to delete world banner:",
            err?.message || err
          );
        })
      );
    }

    await Promise.all(tasks);

    // 4️⃣ Delete row di DB
    await deleteWorld(id);

    res.json({
      success: true,
      message: "✅ World & media deleted successfully",
    });
  } catch (err) {
    console.error("💥 deleteWorldAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
