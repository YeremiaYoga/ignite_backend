import supabase from "../utils/db.js";

export async function getAllBackgrounds() {
  const { data, error } = await supabase
    .from("backgrounds")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getBackgroundById(id) {
  const { data, error } = await supabase
    .from("backgrounds")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createBackground(payload) {
  const { data, error } = await supabase.from("backgrounds").insert(payload).select();
  if (error) throw new Error(error.message);
  return data[0];
}

export async function updateBackground(id, payload) {
  const { data, error } = await supabase
    .from("backgrounds")
    .update(payload)
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
}

export async function deleteBackground(id) {
  const { error } = await supabase.from("backgrounds").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
