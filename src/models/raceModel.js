// src/models/raceModel.js
import supabase from "../utils/db.js";

export const getAllRaces = async () => {
  return await supabase
    .from("races")
    .select("*")
    .order("created_at", { ascending: false });
};

export const getRaceById = async (id) => {
  return await supabase.from("races").select("*").eq("id", id).single();
};

export const getRaceByName = async (name) => {
  return await supabase.from("races").select("*").ilike("name", name);
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
