import supabase from "../utils/db.js";

// === GET ALL FEATS ===
export const getAllFeats = async () => {
  return await supabase
    .from("feats")
    .select("*")
    .order("created_at", { ascending: false });
};

// === GET ONE FEAT ===
export const getFeatById = async (id) => {
  return await supabase.from("feats").select("*").eq("id", id).single();
};

// === CREATE FEAT ===
export const createFeat = async (body) => {
  return await supabase.from("feats").insert([body]).select().single();
};

// === UPDATE FEAT ===
export const updateFeat = async (id, body) => {
  return await supabase.from("feats").update(body).eq("id", id).select().single();
};

// === DELETE FEAT ===
export const deleteFeat = async (id) => {
  return await supabase.from("feats").delete().eq("id", id);
};
