import supabase from "../utils/db.js";

const TABLE = "game_systems";

export const getAllGameSystems = async () => {
  return await supabase.from(TABLE).select("*").order("name", { ascending: true });
};

export const getGameSystemById = async (id) => {
  return await supabase.from(TABLE).select("*").eq("id", id).single();
};

export const createGameSystem = async (data) => {
  return await supabase.from(TABLE).insert([data]).select().single();
};

export const updateGameSystem = async (id, data) => {
  return await supabase.from(TABLE).update(data).eq("id", id).select().single();
};

export const deleteGameSystem = async (id) => {
  return await supabase.from(TABLE).delete().eq("id", id);
};
