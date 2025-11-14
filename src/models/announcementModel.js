import supabase from "../utils/db.js";

const TABLE = "announcements";

export async function getActiveByPosition(position) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, active, icon, name, description, icon_size, position, start_at, end_at, image, image_size"
    )
    .eq("active", true)
    .eq("position", position)
    .lte("start_at", now)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order("start_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

export async function listAnnouncements({
  q,
  position,
  active,
  from,
  to,
  page = 1,
  pageSize = 20,
} = {}) {
  let query = supabase
    .from(TABLE)
    .select(
      "id, active, icon, name, description, icon_size, position, start_at, end_at, image, image_size",
      { count: "exact" }
    )
    .order("start_at", { ascending: false });

  if (q) query = query.ilike("name", `%${q}%`);
  if (position) query = query.eq("position", position);
  if (typeof active === "boolean") query = query.eq("active", active);
  if (from) query = query.gte("start_at", from);
  if (to) query = query.lte("end_at", to);

  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  const { data, error, count } = await query.range(rangeFrom, rangeTo);
  if (error) throw error;

  return { data, count, page, pageSize };
}

export async function createAnnouncement(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAnnouncement(id, payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}


export async function deactivateOtherAnnouncements(position, excludeId) {
  const { data, error } = await supabase
    .from("announcements")
    .update({ active: false })
    .eq("position", position)
    .neq("id", excludeId);

  if (error) {
    console.error("💥 deactivateOtherAnnouncements error:", error.message);
    throw error;
  }
  return data;
}

export async function getAnnouncementById(id) {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("💥 getAnnouncementById error:", error.message);
    throw error;
  }
  return data;
}
