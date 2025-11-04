import supabase from "../utils/db.js";

/**
 * 📋 Ambil semua tier
 */
export const getAllTiers = async () => {
  return await supabase
    .from("tiers")
    .select("*")
    .order("character_limit", { ascending: true });
};

/**
 * 🔍 Ambil tier berdasarkan ID
 */
export const getTierById = async (id) => {
  return await supabase.from("tiers").select("*").eq("id", id).maybeSingle();
};

/**
 * ➕ Buat tier baru
 */
export const createTier = async (data) => {
  return await supabase.from("tiers").insert([data]).select().maybeSingle();
};

/**
 * ✏️ Update tier berdasarkan ID
 */
export const updateTier = async (id, data) => {
  return await supabase
    .from("tiers")
    .update(data)
    .eq("id", id)
    .select()
    .maybeSingle();
};

/**
 * ❌ Hapus tier berdasarkan ID
 */
export const deleteTier = async (id) => {
  return await supabase.from("tiers").delete().eq("id", id);
};
