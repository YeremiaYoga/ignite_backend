import supabase from "../utils/db.js";

export const getAllSpecies = async () => {
  return await supabase
    .from("species")
    .select("*")
    .order("created_at", { ascending: false });
};

export const getSpeciesById = async (id) => {
  return await supabase.from("species").select("*").eq("id", id).single();
};

export const createSpecies = async (data) => {
  return await supabase.from("species").insert([data]).select().single();
};

export const updateSpecies = async (id, data) => {
  return await supabase
    .from("species")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
};

export const deleteSpecies = async (id) => {
  return await supabase.from("species").delete().eq("id", id);
};
