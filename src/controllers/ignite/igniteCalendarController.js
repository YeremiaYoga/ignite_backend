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

/* ---------------- helpers ---------------- */
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

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function toInt(v, fallback = null) {
  if (v === "" || v === undefined || v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeKey(s) {
  return String(s || "").trim().toLowerCase();
}

function findEraByAbbrOrName(eraList, eraCodeOrName) {
  const key = normalizeKey(eraCodeOrName);
  const list = safeArray(eraList);

  return (
    list.find((e) => normalizeKey(e?.abbreviation) === key) ||
    list.find((e) => normalizeKey(e?.name) === key) ||
    null
  );
}

/**
 * total rule:
 * - if era.total exists => use it as absolute max span (>=0)
 * - else if start and end both exist => abs(end - start)
 * - else (end is null/current era) => unlimited (null)
 */
function computeEraTotal(eraObj) {
  const explicit = toInt(eraObj?.total, null);
  if (explicit !== null && explicit >= 0) return explicit;

  const start = toInt(eraObj?.start, null);
  const end = toInt(eraObj?.end, null);

  if (start === null || end === null) return null;
  return Math.abs(end - start);
}

/**
 * current_year input:
 *  {
 *    era: "BC" | "AC" | (or name),
 *    era_year: number (can be negative),
 *    true_year: (ignored; computed)
 *  }
 *
 * compute:
 *   true_year = era.start + era_year
 *
 * validation:
 * - era must exist in era list
 * - era_year must be integer (can be negative)
 * - if era has fixed range (end not null):
 *     true_year must be within [min(start,end), max(start,end)]
 * - if era.total exists:
 *     era_year must be within [-total, +total] (soft bound)
 */
function validateAndBuildCurrentYear({ eraList, input }) {
  if (!input || typeof input !== "object") return { ok: true, value: null };

  const eraCode = String(input?.era || "").trim();
  const eraYear = toInt(input?.era_year, null);

  if (!eraCode) return { ok: false, message: "current_year.era is required" };
  if (eraYear === null)
    return { ok: false, message: "current_year.era_year must be a number" };

  const eraObj = findEraByAbbrOrName(eraList, eraCode);
  if (!eraObj)
    return { ok: false, message: "Selected era not found in calendar era list" };

  const start = toInt(eraObj?.start, null);
  const end = toInt(eraObj?.end, null);

  if (start === null)
    return { ok: false, message: "Selected era is missing start value" };

  const trueYear = start + eraYear;

  // hard bound if end exists (finite era)
  if (end !== null) {
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    if (trueYear < lo || trueYear > hi) {
      return {
        ok: false,
        message: `Year out of era range (${lo}..${hi})`,
      };
    }
  } else {

    const total = computeEraTotal(eraObj);
    if (total !== null && Math.abs(eraYear) > total) {
      return {
        ok: false,
        message: `Year exceeds era total (${total})`,
      };
    }
  }

  return {
    ok: true,
    value: {
      era: eraObj?.abbreviation || eraObj?.name || eraCode,
      era_year: eraYear,
      true_year: trueYear,
    },
  };
}


function validateAndBuildLeapYear(input) {
  if (input === null) return { ok: true, value: null };
  if (!input || typeof input !== "object")
    return { ok: false, message: "leap_year must be an object" };

  const leapStart = toInt(input?.leap_start, null);
  const leapInterval = toInt(input?.leap_interval, null);

  if (leapStart === null)
    return { ok: false, message: "leap_year.leap_start must be a number" };

  if (leapInterval === null)
    return { ok: false, message: "leap_year.leap_interval must be a number" };

  if (leapInterval <= 0)
    return { ok: false, message: "leap_year.leap_interval must be > 0" };

  return {
    ok: true,
    value: {
      leap_start: leapStart,
      leap_interval: leapInterval,
    },
  };
}

/* ---------------- controllers ---------------- */
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
      creator_id: userId,
    });

    if (result.error) {
      console.error("❌ getIgniteCalendars error:", result.error.message);
      return res
        .status(400)
        .json({ success: false, message: result.error.message });
    }

    // redundant safety: ensure only mine
    const mine = (result.data || []).filter((c) => c.creator_id === userId);

    const rows = mine.map((c) => ({
      ...c,
      is_owner: true,
    }));

    return res.json({
      success: true,
      data: rows,
      meta: {
        page: result.page ?? toInt(page, 1) ?? 1,
        limit: result.limit ?? toInt(limit, 50) ?? 50,
        // prefer count if model provides it, else fallback
        total: result.count ?? result.total ?? rows.length,
      },
    });
  } catch (err) {
    console.error("❌ getIgniteCalendars catch:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
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
        page: result.page ?? toInt(page, 1) ?? 1,
        limit: result.limit ?? toInt(limit, 50) ?? 50,
        total: result.count ?? result.total ?? (result.data || []).length,
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
      "current_year",
      "leap_year", // snake_case
      "private",
    ]);

    if (!payload.name) {
      return res
        .status(400)
        .json({ success: false, message: "name is required" });
    }

    // If user sets current_year, era list must exist (for validation)
    if (payload.current_year && !Array.isArray(payload.era)) {
      return res.status(400).json({
        success: false,
        message: "era is required when current_year is set",
      });
    }

    // ✅ validate + compute current_year server-side
    if (payload.current_year) {
      const check = validateAndBuildCurrentYear({
        eraList: payload.era,
        input: payload.current_year,
      });

      if (!check.ok) {
        return res.status(400).json({ success: false, message: check.message });
      }

      payload.current_year = check.value;
    }

    // ✅ validate leap_year server-side (snake_case)
    if (payload.leap_year !== undefined) {
      const checkLeap = validateAndBuildLeapYear(payload.leap_year);
      if (!checkLeap.ok) {
        return res
          .status(400)
          .json({ success: false, message: checkLeap.message });
      }
      payload.leap_year = checkLeap.value;
    }

    payload.creator_id = userId;
    payload.creator_name = req.user?.username || null;

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
      "current_year",
      "leap_year", // snake_case
      "private",
    ]);

    payload.creator_name = req.user?.username || null;

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

    // If user sets current_year, need era list for validation (payload.era or existing.era)
    if (payload.current_year) {
      const eraListForValidation = payload.era ?? existing.era;

      if (!Array.isArray(eraListForValidation)) {
        return res.status(400).json({
          success: false,
          message: "era is required when current_year is set",
        });
      }

      const check = validateAndBuildCurrentYear({
        eraList: eraListForValidation,
        input: payload.current_year,
      });

      if (!check.ok) {
        return res.status(400).json({ success: false, message: check.message });
      }

      payload.current_year = check.value;
    }

    // ✅ validate leap_year server-side (snake_case)
    if (payload.leap_year !== undefined) {
      const checkLeap = validateAndBuildLeapYear(payload.leap_year);
      if (!checkLeap.ok) {
        return res
          .status(400)
          .json({ success: false, message: checkLeap.message });
      }
      payload.leap_year = checkLeap.value;
    }

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
