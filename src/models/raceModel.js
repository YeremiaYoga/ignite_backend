// src/models/raceModel.js
import supabase from "../utils/db.js";

export const getAllRaces = async () => {
  return await supabase
    .from("races")
    .select("*")
    .order("created_at", { ascending: true });
};

export const getRaceById = async (id) => {
  return await supabase.from("races").select("*").eq("id", id).single();
};

export const getRaceByKey = async (key) => {
  return await supabase.from("races").select("*").eq("key", key).limit(1);
};

export const createRace = async (data) => {
  return await supabase.from("races").insert([data]).select().single();
};

export const updateRace = async (id, data) => {
  return await supabase
    .from("races")
    .update(data)
    .eq("id", id)
    .select()
    .single();
};

export const deleteRace = async (id) => {
  return await supabase.from("races").delete().eq("id", id);
};
