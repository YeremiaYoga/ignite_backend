import supabase from "../utils/db.js";

const TABLE = "real_languages";

// 🧠 Get all
export const getAllRealLanguages = async () => {
  return await supabase.from(TABLE).select("*").order("name_en", { ascending: true });
};

// 🔍 Get by ID
export const getRealLanguageById = async (id) => {
  return await supabase.from(TABLE).select("*").eq("id", id).single();
};

// ➕ Create
export const createRealLanguage = async (data) => {
  return await supabase.from(TABLE).insert([data]).select().single();
};

// ✏️ Update
export const updateRealLanguage = async (id, data) => {
  return await supabase.from(TABLE).update(data).eq("id", id).select().single();
};

// ❌ Delete
export const deleteRealLanguage = async (id) => {
  return await supabase.from(TABLE).delete().eq("id", id);
};
