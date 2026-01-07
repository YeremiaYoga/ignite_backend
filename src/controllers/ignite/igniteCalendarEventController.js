import {
  listCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEventById,
  deleteCalendarEventById,
} from "../../models/calendarEventModel.js";

// helper kecil (sama gaya dengan calendar controller)
function pick(obj, keys = []) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

/* =========================
   GET EVENTS
   GET /ignite/calendar-events?calendar_id=&year=&month=
========================= */
export async function getIgniteCalendarEvents(req, res) {
  try {
    const { calendar_id, year, month } = req.query;
    const userId = req.userId;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!calendar_id)
      return res
        .status(400)
        .json({ success: false, message: "calendar_id is required" });

    const { data, error } = await listCalendarEvents({
      calendar_id,
      year,
      month,
    });

    if (error) {
      console.error("❌ getIgniteCalendarEvents:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    // 🔒 safety: only own events
    const rows = (data || []).filter((e) => e.creator_id === userId);

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ getIgniteCalendarEvents catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

/* =========================
   CREATE EVENT
   POST /ignite/calendar-events
========================= */
export async function createIgniteCalendarEvent(req, res) {
  try {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const body = req.body || {};

    const payload = pick(body, [
      "calendar_id",
      "journal_id",
      "title",
      "content",
      "icon",
      "type",
      "year",
      "month",
      "day",
      "repeat_unit",
      "repeat_interval",
      "repeat_count",
      "is_preset",
      "private",
    ]);

    if (!payload.calendar_id || !payload.title) {
      return res.status(400).json({
        success: false,
        message: "calendar_id and title are required",
      });
    }

    payload.creator_id = userId;
    payload.creator_name = req.user?.username || null;

    const { data, error } = await createCalendarEvent(payload);
    if (error) {
      console.error("❌ createIgniteCalendarEvent:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("❌ createIgniteCalendarEvent catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

/* =========================
   UPDATE EVENT
   PATCH /ignite/calendar-events/:id
========================= */
export async function updateIgniteCalendarEvent(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const body = req.body || {};
    const payload = pick(body, [
      "journal_id",
      "title",
      "content",
      "icon",
      "type",
      "year",
      "month",
      "day",
      "repeat_unit",
      "repeat_interval",
      "repeat_count",
      "is_preset",
      "private",
    ]);

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const { data: existing, error: fetchError } = await getCalendarEventById(
      id
    );

    if (fetchError || !existing)
      return res.status(404).json({ success: false, message: "Not found" });

    if (existing.creator_id !== userId)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { data, error } = await updateCalendarEventById(id, payload);
    if (error)
      return res.status(400).json({ success: false, message: error.message });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ updateIgniteCalendarEvent catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

/* =========================
   DELETE EVENT
   DELETE /ignite/calendar-events/:id
========================= */
export async function deleteIgniteCalendarEvent(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { data: existing, error: fetchError } = await getCalendarEventById(
      id
    );

    if (fetchError || !existing)
      return res.status(404).json({ success: false, message: "Not found" });

    if (existing.creator_id !== userId)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { error } = await deleteCalendarEventById(id);
    if (error) {
      console.error("❌ deleteIgniteCalendarEvent:", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("❌ deleteIgniteCalendarEvent catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}
