// models/modifierModel.js
import supabase from "../utils/db.js";

/* ======================================================
   🧩 CONFIG & HELPERS
====================================================== */

const ALLOWED_FOR = [
  "item",
  "magic_item",
  "background",
  "spell",
  "monster",
  "feat",
  "species",
  "subclass",
  "class",
  "trait"
];

function normalizeModifierPayload(data = {}, { partial = false } = {}) {
  const payload = {};

  // name
  if (data.name !== undefined || !partial) {
    payload.name =
      data.name != null ? String(data.name).trim() : partial ? undefined : "";
  }

  // slug
  if (data.slug !== undefined || !partial) {
    payload.slug =
      data.slug != null ? String(data.slug).trim() : partial ? undefined : "";
  }

  // subtypes (jsonb)
  if (data.subtypes !== undefined || !partial) {
    if (data.subtypes == null && partial) {
      payload.subtypes = undefined;
    } else if (Array.isArray(data.subtypes)) {
      payload.subtypes = data.subtypes;
    } else if (data.subtypes == null) {
      payload.subtypes = [];
    } else {
      payload.subtypes = [data.subtypes];
    }
  }

  // public (boolean)
  if (data.public !== undefined || !partial) {
    if (data.public == null && partial) {
      payload.public = undefined;
    } else {
      payload.public = !!data.public;
    }
  }

  // 🔹 target_for (jsonb) — baca dari data.for / data.target_for
  if (data.for !== undefined || data.target_for !== undefined || !partial) {
    let raw = data.for ?? data.target_for;

    let arr = [];

    if (raw == null) {
      // tetap kosong
      arr = [];
    } else if (Array.isArray(raw)) {
      arr = raw;
    } else if (typeof raw === "string") {
      // bisa datang sebagai string JSON
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          arr = parsed;
        } else {
          arr = [parsed];
        }
      } catch {
        // fallback: comma-separated string
        arr = raw.split(",").map((v) => v.trim());
      }
    } else {
      arr = [raw];
    }

    const valid = arr
      .map((v) => String(v).trim())
      .filter((v) => ALLOWED_FOR.includes(v));

    payload.target_for = valid;
  }

  return payload;
}

/* ======================================================
   🧩 MODIFIER CRUD
====================================================== */

export const getAllModifiers = async () => {
  return await supabase
    .from("modifiers")
    .select("*")
    .order("name", { ascending: true });
};

export const getModifierById = async (id) => {
  return await supabase.from("modifiers").select("*").eq("id", id).single();
};

export const createModifier = async (data) => {
  const payload = normalizeModifierPayload(data, { partial: false });

  console.log("📝 createModifier payload:", payload); // 🔍 log

  const { data: row, error } = await supabase
    .from("modifiers")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("❌ Supabase createModifier error:", error);
  }

  return { data: row, error };
};

export const updateModifier = async (id, data) => {
  const payload = normalizeModifierPayload(data, { partial: true });

  console.log("📝 updateModifier payload:", payload); // 🔍 log

  const { data: row, error } = await supabase
    .from("modifiers")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ Supabase updateModifier error:", error);
  }

  return { data: row, error };
};

export const deleteModifier = async (id) => {
  return await supabase.from("modifiers").delete().eq("id", id);
};


/* ======================================================
   🧩 SUBTYPES HANDLING
====================================================== */

export const addSubtype = async (id, subtype) => {
  const { data, error } = await supabase
    .from("modifiers")
    .select("subtypes")
    .eq("id", id)
    .single();

  if (error) return { error };

  const existing = Array.isArray(data.subtypes) ? data.subtypes : [];
  const updated = [...existing, subtype];

  return await supabase
    .from("modifiers")
    .update({
      subtypes: updated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
};

export const updateSubtype = async (id, slug, newData) => {
  const { data, error } = await supabase
    .from("modifiers")
    .select("subtypes")
    .eq("id", id)
    .single();

  if (error) return { error };

  const list = Array.isArray(data.subtypes) ? data.subtypes : [];
  const index = list.findIndex((s) => s.slug === slug);

  if (index === -1) {
    return { error: { message: "Subtype not found" } };
  }

  list[index] = newData;

  return await supabase
    .from("modifiers")
    .update({
      subtypes: list,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
};

export const removeSubtype = async (id, slug) => {
  const { data, error } = await supabase
    .from("modifiers")
    .select("subtypes")
    .eq("id", id)
    .single();

  if (error) return { error };

  const updated = (data.subtypes || []).filter((s) => s.slug !== slug);

  return await supabase
    .from("modifiers")
    .update({
      subtypes: updated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
};
