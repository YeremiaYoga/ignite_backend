import supabase from "../utils/db.js";

const TABLE = "platforms";

export const getAllPlatforms = async () => {
  return await supabase.from(TABLE).select("*").order("name", { ascending: true });
};

export const getPlatformById = async (id) => {
  return await supabase.from(TABLE).select("*").eq("id", id).single();
};

export const createPlatform = async (data) => {
  return await supabase.from(TABLE).insert([data]).select().single();
};

export const updatePlatform = async (id, data) => {
  return await supabase.from(TABLE).update(data).eq("id", id).select().single();
};

export const deletePlatform = async (id) => {
  return await supabase.from(TABLE).delete().eq("id", id);
};
