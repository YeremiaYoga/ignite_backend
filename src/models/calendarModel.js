// src/models/calendarModel.js
import supabase from "../utils/db.js";

const TABLE = "calendars";

function safeSortField(sort) {
  return new Set([
    "created_at",
    "updated_at",
    "name",
    "share_id",
    "private",
  ]).has(sort)
    ? sort
    : "updated_at";
}
function safeOrderBool(order) {
  return String(order).toLowerCase() === "asc";
}
function safePaging(page, limit) {
  const safePage = Math.max(parseInt(page || 1, 10), 1);
  const safeLimit = Math.min(Math.max(parseInt(limit || 20, 10), 1), 100);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  return { safePage, safeLimit, from, to };
}

/**
 * Creator dashboard: hanya milik user (creator_id)
 */
export async function listCalendarsByCreator({
  q = "",
  sort = "updated_at",
  order = "desc",
  page = 1,
  limit = 20,
  creator_id,
  private_only = null, 
} = {}) {
  const safeSort = safeSortField(sort);
  const ascending = safeOrderBool(order);
  const { safePage, safeLimit, from, to } = safePaging(page, limit);

  let query = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("creator_id", creator_id)
    .order(safeSort, { ascending })
    .range(from, to);

  if (q && String(q).trim()) {
    const term = String(q).trim().replace(/"/g, '\\"');
    query = query.or(`name.ilike."%${term}%",share_id.ilike."%${term}%"`);
  }

  if (typeof private_only === "boolean") {
    query = query.eq("private", private_only);
  }

  const { data, error, count } = await query;
  return { data, error, count, page: safePage, limit: safeLimit };
}

/**
 * Public listing: hanya yang private = false
 */
export async function listPublicCalendars({
  q = "",
  sort = "updated_at",
  order = "desc",
  page = 1,
  limit = 20,
} = {}) {
  const safeSort = safeSortField(sort);
  const ascending = safeOrderBool(order);
  const { safePage, safeLimit, from, to } = safePaging(page, limit);

  let query = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("private", false)
    .order(safeSort, { ascending })
    .range(from, to);

  if (q && String(q).trim()) {
    const term = String(q).trim().replace(/"/g, '\\"');
    query = query.or(`name.ilike."%${term}%",share_id.ilike."%${term}%"`);
  }

  const { data, error, count } = await query;
  return { data, error, count, page: safePage, limit: safeLimit };
}

export async function getCalendarById(id) {
  return await supabase.from(TABLE).select("*").eq("id", id).single();
}

/**
 * Public calendar by share_id
 * hanya boleh kalau private = false
 */
export async function getCalendarByShareId(shareId) {
  return await supabase
    .from(TABLE)
    .select("*")
    .eq("share_id", shareId)
    .eq("private", false)
    .single();
}

export async function createCalendar(payload) {
  return await supabase.from(TABLE).insert([payload]).select("*").single();
}

export async function updateCalendarById(id, payload) {
  return await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
}

export async function deleteCalendarById(id) {
  return await supabase.from(TABLE).delete().eq("id", id);
}

export async function listCalendarsAllForCreatorView({
  q,
  sort,
  order,
  page = 1,
  limit = 20,
  private_only = null,
  creator_id = null,
}) {
  const from = Math.max(0, (Number(page) - 1) * Number(limit));
  const to = from + Number(limit) - 1;

  let query = supabase.from("calendars").select("*", { count: "exact" });

  if (creator_id) query = query.eq("creator_id", creator_id);

  if (private_only === true) query = query.eq("private", true);
  if (private_only === false) query = query.eq("private", false);

  if (q?.trim()) {
    const qq = q.trim();
    query = query.or(
      `name.ilike.%${qq}%,abbreviation.ilike.%${qq}%,share_id.ilike.%${qq}%`
    );
  }

  const safeSort = ["updated_at", "created_at", "name"].includes(sort)
    ? sort
    : "updated_at";
  const safeAsc = String(order).toLowerCase() === "asc";
  query = query.order(safeSort, { ascending: safeAsc });

  const { data, error, count } = await query.range(from, to);

  return {
    data,
    error,
    count,
    page: Number(page),
    limit: Number(limit),
  };
}
