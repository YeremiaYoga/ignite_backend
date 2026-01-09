// models/tokenBorderModel.js
import supabase from "../utils/db.js";

const TABLE = "token_borders";

export async function getTokenBorders() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTokenBorderById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTokenBorder(payload) {
  return supabase.from("token_borders").insert(payload).select().single();
}

export async function updateTokenBorder(id, payload) {
  return supabase
    .from("token_borders")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteTokenBorder(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  return true;
}
