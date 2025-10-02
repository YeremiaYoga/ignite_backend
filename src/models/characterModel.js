import supabase from "../utils/db.js";

// CREATE
export const createCharacter = async (characterData) => {
  return await supabase.from("characters").insert([characterData]).select();
};

// GET ALL
export const getAllCharacters = async () => {
  return await supabase.from("characters").select("*");
};

// GET ALL BY USER ID
export const getCharactersByUserId = async (userId) => {
  return await supabase.from("characters").select("*").eq("user_id", userId);
};

// GET BY ID
export const getCharacterById = async (id) => {
  return await supabase.from("characters").select("*").eq("id", id).single();
};

// UPDATE
export const updateCharacter = async (id, updateData) => {
  return await supabase
    .from("characters")
    .update(updateData)
    .eq("id", id)
    .select();
};

// DELETE
export const deleteCharacter = async (id) => {
  return await supabase.from("characters").delete().eq("id", id);
};
