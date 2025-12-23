// src/models/timelineModel.js
import supabase from "../utils/db.js";

/**
 * Table: timeline
 * Columns:
 * id (uuid), name (text), share_id (text),
 * epoch (jsonb), era (jsonb), other_era (jsonb),
 * days_in_a_year (int), months (jsonb), weeks (jsonb), moon_cycle (jsonb),
 * created_at, updated_at, created_by
 */

const TABLE = "timeline";

export async function listTimelines({
  q = "",
  sort = "updated_at",
  order = "desc",
  page = 1,
  limit = 20,
  created_by = null,
} = {}) {
  const safeSort = new Set([
    "created_at",
    "updated_at",
    "name",
    "share_id",
    "days_in_a_year",
  ]).has(sort)
    ? sort
    : "updated_at";

  const safeOrder = String(order).toLowerCase() === "asc";

  const safePage = Math.max(parseInt(page || 1, 10), 1);
  const safeLimit = Math.min(Math.max(parseInt(limit || 20, 10), 1), 100);

  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order(safeSort, { ascending: safeOrder })
    .range(from, to);

  if (q && String(q).trim()) {
    // cari di name atau share_id
    const term = String(q).trim().replace(/"/g, '\\"');
    query = query.or(`name.ilike."%${term}%",share_id.ilike."%${term}%"`);
  }

  if (created_by) {
    query = query.eq("created_by", created_by);
  }

  const { data, error, count } = await query;

  return { data, error, count, page: safePage, limit: safeLimit };
}

export async function getTimelineById(id) {
  return await supabase.from(TABLE).select("*").eq("id", id).single();
}

export async function getTimelineByShareId(shareId) {
  return await supabase.from(TABLE).select("*").eq("share_id", shareId).single();
}

export async function createTimeline(payload) {
  return await supabase.from(TABLE).insert([payload]).select("*").single();
}

export async function updateTimelineById(id, payload) {
  return await supabase.from(TABLE).update(payload).eq("id", id).select("*").single();
}

export async function deleteTimelineById(id) {
  return await supabase.from(TABLE).delete().eq("id", id);
}
