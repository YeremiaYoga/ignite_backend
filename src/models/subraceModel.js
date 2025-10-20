import supabase from "../utils/db.js";

export const getAllSubraces = async () => {
  return await supabase.from("subraces").select("*");
};

export const getSubracesByRaceId = async (raceId) => {
  return await supabase.from("subraces").select("*").eq("race_id", raceId);
};

export const createSubrace = async (data) => {
  return await supabase.from("subraces").insert(data);
};

export const updateSubrace = async (id, data) => {
  return await supabase.from("subraces").update(data).eq("id", id);
};

export const removeSubrace = async (id) => {
  return await supabase.from("subraces").delete().eq("id", id);
};
