import supabase from "../utils/db.js";

// CREATE
export const createCharacter = async (characterData) => {
  try {
    const { data, error } = await supabase
      .from("characters")
      .insert([characterData])
      .select("*")
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error.message);
      return { data: null, error };
    }

    console.log("✅ Character created:", data);
    return { data, error: null };
  } catch (err) {
    console.error("💥 createCharacter fatal error:", err);
    return { data: null, error: err };
  }
};


// GET ALL
export const getAllCharacters = async () => {
  return await supabase.from("characters").select("*");
};

export const getCharactersByUserId = async (userId) => {
  return await supabase
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .eq("record_status", "active");
};

export const getCharactersByUserIdTrash = async (userId) => {
  return await supabase
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .eq("record_status", "trash");
};

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

export const markExpiredTrashCharactersAsDeleted = async (userId) => {
  try {
    const fiveDaysAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    const { data: expiredChars, error: fetchError } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId)
      .eq("record_status", "trash")
      .lte("deleted_at", fiveDaysAgo.toISOString());

    if (fetchError) return { data: null, error: fetchError };

    const updatedChars = [];
    for (const char of expiredChars) {
      const { data, error } = await supabase
        .from("characters")
        .update({ record_status: "deleted", deleted_at: null })
        .eq("id", char.id)
        .select();

      if (error) return { data: null, error };
      updatedChars.push(...data);
    }

    return { data: updatedChars, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};
