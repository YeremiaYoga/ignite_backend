import {
  listHomebrewSources,
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
  if (!row) return false;
  if (!row.created_by) return false;
  return String(row.created_by) === String(userId);
}

export async function getHomebrewSources(req, res) {
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
      console.error("❌ getHomebrewSources error:", result.error.message);
      return res.status(400).json({ success: false, message: result.error.message });
    }

    const userId = getUserId(req);
    const filtered = (result.data || []).filter((row) => {
      if (row.private === true) return userId && isOwner(row, userId);
      return true;
    });

    return res.json({ success: true, data: filtered, meta: result.meta });
  } catch (e) {
    console.error("❌ getHomebrewSources exception:", e);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function getHomebrewSource(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await getHomebrewSourceById(id);

    if (error) {
      return res.status(404).json({ success: false, message: error.message });
    }

    const userId = getUserId(req);
    if (data?.private === true && !isOwner(data, userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ getHomebrewSource exception:", e);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function getHomebrewSourceByShare(req, res) {
  try {
    const { shareId } = req.params;
    const { data, error } = await getHomebrewSourceByShareId(shareId);

    if (error) {
      return res.status(404).json({ success: false, message: error.message });
    }

    const userId = getUserId(req);
    if (data?.private === true && !isOwner(data, userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ getHomebrewSourceByShare exception:", e);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function postHomebrewSource(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, description = null, share_id = null, private: isPrivate = false } =
      req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const payload = {
      name: String(name).trim(),
      description: description === "" ? null : description,
      share_id: share_id === "" ? null : share_id,
      private: Boolean(isPrivate),
      created_by: String(userId),
    };

    const { data, error } = await createHomebrewSource(payload);
    if (error) {
      console.error("❌ postHomebrewSource error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error("❌ postHomebrewSource exception:", e);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function patchHomebrewSource(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    const { data: existing, error: getErr } = await getHomebrewSourceById(id);
    if (getErr) {
      return res.status(404).json({ success: false, message: getErr.message });
    }

    if (!isOwner(existing, userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { name, description, share_id, private: isPrivate } = req.body || {};

    const payload = {};
    if (name !== undefined) payload.name = String(name).trim();
    if (description !== undefined) payload.description = description === "" ? null : description;
    if (share_id !== undefined) payload.share_id = share_id === "" ? null : share_id;
    if (isPrivate !== undefined) payload.private = Boolean(isPrivate);

    const { data, error } = await updateHomebrewSource(id, payload);
    if (error) {
      console.error("❌ patchHomebrewSource error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ patchHomebrewSource exception:", e);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function removeHomebrewSource(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    const { data: existing, error: getErr } = await getHomebrewSourceById(id);
    if (getErr) {
      return res.status(404).json({ success: false, message: getErr.message });
    }

    if (!isOwner(existing, userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { error } = await deleteHomebrewSource(id);
    if (error) {
      console.error("❌ removeHomebrewSource error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, message: "Deleted" });
  } catch (e) {
    console.error("❌ removeHomebrewSource exception:", e);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
