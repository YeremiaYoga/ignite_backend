import supabase from "../utils/db.js";

// 🧠 Get all traits
export const getAllTraits = async () => {
  return await supabase
    .from("species_traits")
    .select("*")
    .order("display_order", { ascending: true });
};

// 🔍 Get trait by ID
export const getTraitById = async (id) => {
  return await supabase
    .from("species_traits")
    .select("*")
    .eq("id", id)
    .single();
};

// ➕ Create new trait
export const createTrait = async (data) => {
  return await supabase.from("species_traits").insert([data]).select().single();
};

// ✏️ Update existing trait
export const updateTrait = async (id, data) => {
  return await supabase
    .from("species_traits")
    .update(data)
    .eq("id", id)
    .select()
    .single();
};

// ❌ Delete trait
export const deleteTrait = async (id) => {
  return await supabase.from("species_traits").delete().eq("id", id);
};

export const getTraitsByIds = async (ids) => {
  return await supabase.from("species_traits").select("*").in("id", ids);
};
