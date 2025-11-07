import supabase from "../utils/db.js";

/* ======================================================
   🧩 BASE TRAIT MODIFIER CRUD
====================================================== */

export const getAllTraitModifiers = async () => {
  return await supabase
    .from("trait_modifiers")
    .select("*")
    .order("name", { ascending: true });
};

export const getTraitModifierById = async (id) => {
  return await supabase.from("trait_modifiers").select("*").eq("id", id).single();
};

export const createTraitModifier = async (data) => {
  return await supabase.from("trait_modifiers").insert([data]).select().single();
};

export const updateTraitModifier = async (id, data) => {
  return await supabase
    .from("trait_modifiers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
};

export const deleteTraitModifier = async (id) => {
  return await supabase.from("trait_modifiers").delete().eq("id", id);
};

/* ======================================================
   🧩 SUBTYPE OPERATIONS
====================================================== */

// ➕ Tambah subtype baru ke modifier
export const addSubtypeToModifier = async (id, subtype) => {
  const { data, error } = await supabase
    .from("trait_modifiers")
    .select("subtypes")
    .eq("id", id)
    .single();

  if (error) return { error };

  const existing = data.subtypes || [];
  const updatedSubtypes = [...existing, subtype];

  return await supabase
    .from("trait_modifiers")
    .update({ subtypes: updatedSubtypes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
};

// ✏️ Edit subtype berdasarkan slug
export const updateSubtypeInModifier = async (id, slug, newSubtype) => {
  const { data, error } = await supabase
    .from("trait_modifiers")
    .select("subtypes")
    .eq("id", id)
    .single();

  if (error) return { error };

  const existingSubtypes = data.subtypes || [];
  const index = existingSubtypes.findIndex((s) => s.slug === slug);
  if (index === -1)
    return { error: { message: "Subtype not found" } };

  existingSubtypes[index] = newSubtype;

  return await supabase
    .from("trait_modifiers")
    .update({
      subtypes: existingSubtypes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
};

// ❌ Hapus subtype berdasarkan slug
export const removeSubtypeFromModifier = async (id, slug) => {
  const { data, error } = await supabase
    .from("trait_modifiers")
    .select("subtypes")
    .eq("id", id)
    .single();

  if (error) return { error };

  const updatedSubtypes = (data.subtypes || []).filter((s) => s.slug !== slug);

  return await supabase
    .from("trait_modifiers")
    .update({
      subtypes: updatedSubtypes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
};
