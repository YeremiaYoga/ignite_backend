// src/controllers/ignite/igniteTimelineController.js
import {
  listTimelines,
  getTimelineById,
  getTimelineByShareId,
  createTimeline,
  updateTimelineById,
  deleteTimelineById,
} from "../../models/timelineModel.js";

// helper kecil
function pick(obj, keys = []) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}


export async function getIgniteTimelines(req, res) {
  try {
    const { q, sort, order, page, limit } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await listTimelines({
      q,
      sort,
      order,
      page,
      limit,
      created_by: userId, 
    });

    if (result.error) {
      console.error("❌ getIgniteTimelines error:", result.error.message);
      return res.status(400).json({ success: false, message: result.error.message });
    }

    return res.json({
      success: true,
      data: result.data || [],
      meta: { page: result.page, limit: result.limit, total: result.count ?? 0 },
    });
  } catch (err) {
    console.error("❌ getIgniteTimelines catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}



export async function getIgniteTimelineById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { data, error } = await getTimelineById(id);
    if (error || !data) {
      return res.status(404).json({ success: false, message: error?.message || "Not found" });
    }

    if (data.created_by !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getIgniteTimelineById catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}



export async function getIgniteTimelineByShareId(req, res) {
  try {
    const { share_id } = req.params;

    const { data, error } = await getTimelineByShareId(share_id);
    if (error) {
      return res.status(404).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getIgniteTimelineByShareId catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}


export async function createIgniteTimeline(req, res) {
  try {
    const body = req.body || {};
    const userId = req.userId; 

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const payload = pick(body, [
      "name",
      "share_id",
      "epoch",
      "era",
      "other_era",
      "days_in_a_year",
      "months",
      "weeks",
      "moon_cycle",
    ]);

    if (!payload.name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    payload.created_by = userId; // ✅ server-side, tidak bisa diakalin

    const { data, error } = await createTimeline(payload);
    if (error) {
      console.error("❌ createIgniteTimeline error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("❌ createIgniteTimeline catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function updateIgniteTimeline(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const body = req.body || {};
    const payload = pick(body, [
      "name","share_id","epoch","era","other_era","days_in_a_year","months","weeks","moon_cycle",
    ]);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    // ✅ owner check
    const { data: existing, error: fetchError } = await getTimelineById(id);
    if (fetchError || !existing) return res.status(404).json({ success: false, message: "Not found" });
    if (existing.created_by !== userId) return res.status(403).json({ success: false, message: "Forbidden" });

    const { data, error } = await updateTimelineById(id, payload);
    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ updateIgniteTimeline catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function deleteIgniteTimeline(req, res) {
  try {
    const { id } = req.params;

    const { error } = await deleteTimelineById(id);
    if (error) {
      console.error("❌ deleteIgniteTimeline error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("❌ deleteIgniteTimeline catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
