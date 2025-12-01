// models/foundrySpellModel.js
import supabase from "../utils/db.js";

export async function insertFoundrySpell(payload) {
  const {
    name,
    type,
    properties,
    level,
    school,
    description,
    affects,          // text

    image,
    compendium_source,
    source_book,
    price,

    // JSONB objek penuh
    activation,       // { value, type, condition }
    range,            // { value, units }
    template,         // { size, type, units }
    materials,        // { cost, value, consume }
    duration,         // { value, units }

    favorites,
    favorites_count,
    ratings,
    ratings_count,

    raw_data,
    format_data,
  } = payload;

  const favArr = Array.isArray(favorites) ? favorites : [];
  const rateArr = Array.isArray(ratings) ? ratings : [];

  const favCount =
    typeof favorites_count === "number" ? favorites_count : favArr.length;
  const rateCount =
    typeof ratings_count === "number" ? ratings_count : rateArr.length;

  const { data, error } = await supabase
    .from("foundry_spells")
    .insert({
      name,
      type,
      properties,
      level,
      school,
      description,
      affects: affects ?? null,

      image,
      compendium_source,
      source_book,
      price: price ?? null,

      activation: activation ?? null,   // 🔥 JSONB
      range: range ?? null,             // 🔥 JSONB
      template: template ?? null,       // 🔥 JSONB
      materials: materials ?? null,     // 🔥 JSONB
      duration: duration ?? null,       // 🔥 JSONB

      favorites: favArr,
      favorites_count: favCount,
      ratings: rateArr,
      ratings_count: rateCount,

      raw_data: raw_data ?? {},
      format_data: format_data ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("❌ insertFoundrySpell error:", error.message);
    throw error;
  }

  return data;
}

export async function bulkInsertFoundrySpells(items) {
  if (!items?.length) return [];

  const rows = items.map((it) => {
    const favArr = Array.isArray(it.favorites) ? it.favorites : [];
    const rateArr = Array.isArray(it.ratings) ? it.ratings : [];

    const favCount =
      typeof it.favorites_count === "number"
        ? it.favorites_count
        : favArr.length;
    const rateCount =
      typeof it.ratings_count === "number"
        ? it.ratings_count
        : rateArr.length;

    return {
      name: it.name,
      type: it.type,
      properties: it.properties ?? null,
      level: it.level ?? null,
      school: it.school ?? null,
      description: it.description ?? null,
      affects: it.affects ?? null,

      image: it.image ?? null,
      compendium_source: it.compendium_source ?? null,
      source_book: it.source_book ?? null,
      price: it.price ?? null,

      activation: it.activation ?? null,   // objek langsung
      range: it.range ?? null,
      template: it.template ?? null,
      materials: it.materials ?? null,
      duration: it.duration ?? null,

      favorites: favArr,
      favorites_count: favCount,
      ratings: rateArr,
      ratings_count: rateCount,

      raw_data: it.raw_data ?? {},
      format_data: it.format_data ?? {},
    };
  });

  const { data, error } = await supabase
    .from("foundry_spells")
    .insert(rows)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundrySpells error:", error.message);
    throw error;
  }

  return data;
}

export async function listFoundrySpells({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("foundry_spells")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("❌ listFoundrySpells error:", error.message);
    throw error;
  }

  return data;
}

export async function getFoundrySpellById(id) {
  const { data, error } = await supabase
    .from("foundry_spells")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundrySpellById error:", error.message);
    throw error;
  }

  return data;
}

export async function updateFoundrySpell(id, payload) {
  const { data, error } = await supabase
    .from("foundry_spells")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundrySpell error:", error.message);
    throw error;
  }

  return data;
}

export async function deleteFoundrySpell(id) {
  const { error } = await supabase
    .from("foundry_spells")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundrySpell error:", error.message);
    throw error;
  }
}
