// src/controllers/ignite/igniteHomebrewController.js
import {
  listHomebrewSources,
  getAllHomebrewSourcesPlain,
  getHomebrewSourceById,
  getHomebrewSourceByShareId,
  createHomebrewSource,
  updateHomebrewSource,
  deleteHomebrewSource,
} from "../../models/homebrewSourceModel.js";

function getUserId(req) {
  return req.user?.id || req.user?.userId || req.headers["x-user-id"] || null;
}

function isOwner(row, userId) {
  if (!row?.created_by) return false;
  return String(row.created_by) === String(userId);
}

// =====================
// GET LIST (hide private)
// =====================
export async function getIgniteHomebrewSources(req, res) {
  try {
    const { q, sort, order, page, limit, created_by, private: privateStr } =
      req.query;

    const privateOnly =
      privateStr === undefined
        ? null
        : privateStr === "true" || privateStr === "1";

    const result = await listHomebrewSources({
      q,
      sort,
      order,
      page,
      limit,
      created_by: created_by || null,
      privateOnly,
    });

    if (result.error) {
      console.error("❌ getIgniteHomebrewSources error:", result.error.message);
      return res
        .status(400)
        .json({ success: false, message: result.error.message });
    }

    // 🔒 hanya filter private (tanpa owner)
    const rows = (result.data || []).filter((row) => row.private !== true);

    return res.json({ success: true, data: rows, meta: result.meta });
  } catch (e) {
    console.error("❌ getIgniteHomebrewSources exception:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

// =====================
// GET ALL (plain, no filter)
// =====================
export async function getIgniteHomebrewAll(req, res) {
  try {
    const { data, error } = await getAllHomebrewSourcesPlain();

    if (error) {
      console.error("❌ getIgniteHomebrewAll error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error("❌ getIgniteHomebrewAll exception:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

// =====================
// GET BY ID (safe: block private)
// =====================
export async function getIgniteHomebrewSource(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await getHomebrewSourceById(id);
    if (error) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (data?.private === true) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ getIgniteHomebrewSource exception:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

// =====================
// GET BY SHARE (safe: block private)
// =====================
export async function getIgniteHomebrewSourceByShare(req, res) {
  try {
    const { shareId } = req.params;

    const { data, error } = await getHomebrewSourceByShareId(shareId);
    if (error) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (data?.private === true) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ getIgniteHomebrewSourceByShare exception:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

// =====================
// CREATE
// =====================
export async function postIgniteHomebrewSource(req, res) {
  try {
    const {
      name,
      description = null,
      share_id = null,
      private: isPrivate = false,
      created_by = null,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const payload = {
      name: String(name).trim(),
      description: description === "" ? null : description,
      share_id: share_id === "" ? null : share_id,
      private: Boolean(isPrivate),
      created_by: created_by ?? null,
    };

    const { data, error } = await createHomebrewSource(payload);
    if (error) {
      console.error("❌ postIgniteHomebrewSource error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error("❌ postIgniteHomebrewSource exception:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

// =====================
// UPDATE
// =====================
export async function patchIgniteHomebrewSource(req, res) {
  try {
    const { id } = req.params;
    const { name, description, share_id, private: isPrivate, created_by } =
      req.body || {};

    const payload = {};
    if (name !== undefined) payload.name = String(name).trim();
    if (description !== undefined)
      payload.description = description === "" ? null : description;
    if (share_id !== undefined) payload.share_id = share_id === "" ? null : share_id;
    if (isPrivate !== undefined) payload.private = Boolean(isPrivate);
    if (created_by !== undefined) payload.created_by = created_by;

    const { data, error } = await updateHomebrewSource(id, payload);
    if (error) {
      console.error("❌ patchIgniteHomebrewSource error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ patchIgniteHomebrewSource exception:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}


export async function removeIgniteHomebrewSource(req, res) {
  try {
    const { id } = req.params;

    const { error } = await deleteHomebrewSource(id);
    if (error) {
      console.error("❌ removeIgniteHomebrewSource error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, message: "Deleted" });
  } catch (e) {
    console.error("❌ removeIgniteHomebrewSource exception:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}
