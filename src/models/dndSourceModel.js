import supabase from "../utils/db.js";

// 🔹 Ambil semua source
export const getAllDndSources = async () => {
  return await supabase.from("dnd_source").select("*").order("name", { ascending: true });
};

// 🔹 Ambil source by ID
export const getDndSourceById = async (id) => {
  return await supabase.from("dnd_source").select("*").eq("id", id).single();
};

// 🔹 Tambah source
export const createDndSource = async (data) => {
  return await supabase.from("dnd_source").insert([data]).select().single();
};

// 🔹 Update source
export const updateDndSource = async (id, data) => {
  return await supabase.from("dnd_source").update(data).eq("id", id).select().single();
};

// 🔹 Hapus source
export const deleteDndSource = async (id) => {
  return await supabase.from("dnd_source").delete().eq("id", id);
};
