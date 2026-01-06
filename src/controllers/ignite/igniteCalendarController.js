// src/controllers/ignite/igniteCalendarController.js
import {
  listCalendarsAllForCreatorView,
  listPublicCalendars,
  getCalendarById,
  getCalendarByShareId,
  createCalendar,
  updateCalendarById,
  deleteCalendarById,
} from "../../models/calendarModel.js";

// helper kecil
function pick(obj, keys = []) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function parseBool(v) {
  if (v === true || v === false) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function getIgniteCalendars(req, res) {
  try {
    const { q, sort, order, page, limit, private: privateQuery } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await listCalendarsAllForCreatorView({
      q,
      sort,
      order,
      page,
      limit,
      private_only: parseBool(privateQuery),
      creator_id: userId, // ✅ FILTER DI DB
    });

    if (result.error) {
      console.error("❌ getIgniteCalendars error:", result.error.message);
      return res.status(400).json({ success: false, message: result.error.message });
    }

    // ✅ safety-net filter (optional but recommended)
    const mine = (result.data || []).filter((c) => c.creator_id === userId);

    const rows = mine.map((c) => ({
      ...c,
      is_owner: true,
    }));

    return res.json({
      success: true,
      data: rows,
      meta: {
        page: result.page,
        limit: result.limit,
        total: rows.length, // atau result.count kalau kamu count juga sesuai filter
      },
    });
  } catch (err) {
    console.error("❌ getIgniteCalendars catch:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}


export async function getIgnitePublicCalendars(req, res) {
  try {
    const { q, sort, order, page, limit } = req.query;

    const result = await listPublicCalendars({ q, sort, order, page, limit });

    if (result.error) {
      console.error("❌ getIgnitePublicCalendars error:", result.error.message);
      return res
        .status(400)
        .json({ success: false, message: result.error.message });
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
    console.error("❌ getIgnitePublicCalendars catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * Owner-only detail
 * GET /ignite/calendars/:id
 */
export async function getIgniteCalendarById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { data, error } = await getCalendarById(id);
    if (error || !data) {
      return res
        .status(404)
        .json({ success: false, message: error?.message || "Not found" });
    }

    if (data.creator_id !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getIgniteCalendarById catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

export async function getIgniteCalendarByShareId(req, res) {
  try {
    const { share_id } = req.params;

    const { data, error } = await getCalendarByShareId(share_id);
    if (error || !data) {
      return res
        .status(404)
        .json({ success: false, message: error?.message || "Not found" });
    }

    // ✅ penting: kalau private, jangan boleh diakses
    if (data.private === true) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getIgniteCalendarByShareId catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * Create calendar
 * POST /ignite/calendars
 */
export async function createIgniteCalendar(req, res) {
  try {
    const body = req.body || {};
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const payload = pick(body, [
      "name",
      "abbreviation",
      "share_id",
      "epoch",
      "era",
      "other_era",
      "months",
      "days",
      "seasons",
      "weather",
      "moon_cycle",
      "private",
    ]);

    if (!payload.name) {
      return res
        .status(400)
        .json({ success: false, message: "name is required" });
    }

    payload.creator_id = userId;
    payload.creator_name = req.user.username || null;

    payload.private =
      typeof payload.private === "boolean" ? payload.private : true;

    const { data, error } = await createCalendar(payload);
    if (error) {
      console.error("❌ createIgniteCalendar error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("❌ createIgniteCalendar catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

export async function updateIgniteCalendar(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const body = req.body || {};
    const payload = pick(body, [
      "name",
      "abbreviation",
      "share_id",
      "epoch",
      "era",
      "other_era",
      "months",
      "days",
      "seasons",
      "weather",
      "moon_cycle",
      "private",
    ]);

    payload.creator_name = req.user.username || null;
    
    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const { data: existing, error: fetchError } = await getCalendarById(id);
    if (fetchError || !existing)
      return res.status(404).json({ success: false, message: "Not found" });
    if (existing.creator_id !== userId)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { data, error } = await updateCalendarById(id, payload);
    if (error)
      return res.status(400).json({ success: false, message: error.message });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ updateIgniteCalendar catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

export async function deleteIgniteCalendar(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { data: existing, error: fetchError } = await getCalendarById(id);
    if (fetchError || !existing)
      return res.status(404).json({ success: false, message: "Not found" });
    if (existing.creator_id !== userId)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { error } = await deleteCalendarById(id);
    if (error) {
      console.error("❌ deleteIgniteCalendar error:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("❌ deleteIgniteCalendar catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}
