import supabase from "../utils/db.js";

/* THEME */
export async function listThemes() {
  const { data, error } = await supabase
    .from("theme_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function createTheme(payload) {
  const { data, error } = await supabase
    .from("theme_campaigns")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateTheme(id, payload) {
  const { data, error } = await supabase
    .from("theme_campaigns")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteTheme(id) {
  const { error } = await supabase.from("theme_campaigns").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/* GENRE */
export async function listGenres() {
  const { data, error } = await supabase
    .from("genre_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function createGenre(payload) {
  const { data, error } = await supabase
    .from("genre_campaigns")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateGenre(id, payload) {
  const { data, error } = await supabase
    .from("genre_campaigns")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteGenre(id) {
  const { error } = await supabase.from("genre_campaigns").delete().eq("id", id);
  if (error) throw error;
  return true;
}
