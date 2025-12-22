import supabase from "../utils/db.js";


export const getAllTiers = async () => {
  return await supabase
    .from("tiers")
    .select("*")
    .order("character_limit", { ascending: true });
};


export const getTierById = async (id) => {
  return await supabase.from("tiers").select("*").eq("id", id).maybeSingle();
};


export const createTier = async (data) => {
  return await supabase.from("tiers").insert([data]).select().maybeSingle();
};


export const updateTier = async (id, data) => {
  return await supabase
    .from("tiers")
    .update(data)
    .eq("id", id)
    .select()
    .maybeSingle();
};


export const deleteTier = async (id) => {
  return await supabase.from("tiers").delete().eq("id", id);
};
