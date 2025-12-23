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
    const { q, sort, order, page, limit, created_by } = req.query;

    const result = await listTimelines({
      q,
      sort,
      order,
      page,
      limit,
      created_by: created_by || null,
    });

    if (result.error) {
      console.error("❌ getIgniteTimelines error:", result.error.message);
      return res.status(400).json({ success: false, message: result.error.message });
    }

    return res.json({
      success: true,
      data: result.data || [],
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.count ?? 0,
      },
    });
  } catch (err) {
    console.error("❌ getIgniteTimelines catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// ===== GET ONE BY ID =====
// GET /ignite/timelines/:id
export async function getIgniteTimelineById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await getTimelineById(id);
    if (error) {
      return res.status(404).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getIgniteTimelineById catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// ===== GET ONE BY SHARE ID =====
// GET /ignite/timelines/share/:share_id
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

// ===== CREATE =====
// POST /ignite/timelines
export async function createIgniteTimeline(req, res) {
  try {
    const body = req.body || {};

    // allowlist fields supaya aman
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
      "created_by",
    ]);

    if (!payload.name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

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

// ===== UPDATE =====
// PATCH /ignite/timelines/:id
export async function updateIgniteTimeline(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

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

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const { data, error } = await updateTimelineById(id, payload);
    if (error) {
      console.error("❌ updateIgniteTimeline error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ updateIgniteTimeline catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// ===== DELETE =====
// DELETE /ignite/timelines/:id
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
