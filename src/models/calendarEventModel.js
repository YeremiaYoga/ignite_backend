import supabase from "../utils/db.js";

/* =========================
   LIST EVENTS (by calendar)
========================= */
export async function listCalendarEvents({
  calendar_id,
  year = null,
  month = null,
  creator_id = null,
}) {
  if (!calendar_id) {
    return { data: null, error: new Error("calendar_id is required") };
  }

  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("calendar_id", calendar_id)
    .order("year", { ascending: true })
    .order("month", { ascending: true })
    .order("day", { ascending: true });

  if (creator_id) query = query.eq("creator_id", creator_id); // ✅ add

  if (Number.isFinite(Number(year))) query = query.eq("year", Number(year));
  if (Number.isFinite(Number(month))) query = query.eq("month", Number(month));

  const { data, error } = await query;
  return { data, error };
}


/* =========================
   GET EVENT BY ID
========================= */
export async function getCalendarEventById(id) {
  return supabase
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
}

/* =========================
   CREATE EVENT
========================= */
export async function createCalendarEvent(payload) {
  return supabase
    .from("calendar_events")
    .insert(payload)
    .select("*")
    .single();
}

/* =========================
   UPDATE EVENT
========================= */
export async function updateCalendarEventById(id, payload) {
  payload.updated_at = new Date().toISOString();

  return supabase
    .from("calendar_events")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
}

/* =========================
   DELETE EVENT
========================= */
export async function deleteCalendarEventById(id) {
  return supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
}
