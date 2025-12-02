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
  const insertData = {
    name: payload.name,
    description: payload.description ?? null,
    image_url: payload.image_url ?? null,
    is_paid: payload.is_paid ?? false,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTokenBorder(id, payload) {
  const updateData = {
    name: payload.name,
    description: payload.description,
    image_url: payload.image_url,
    is_paid: payload.is_paid,
  };

  // buang undefined biar nggak nulis field aneh
  Object.keys(updateData).forEach((key) => {
    if (typeof updateData[key] === "undefined") {
      delete updateData[key];
    }
  });

  const { data, error } = await supabase
    .from(TABLE)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTokenBorder(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  return true;
}
