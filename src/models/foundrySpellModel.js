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
    material,
    target,
    affected,
    range,
    activation,
    duration,
    image,
    compendium_source,
    source_book,
    raw_data,
    format_data,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_spells")
    .insert({
      name,
      type,
      properties,
      level,
      school,
      description,
      material,
      target,
      affected,
      range,
      activation,
      duration,
      image,
      compendium_source,
      source_book,
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

  const rows = items.map((it) => ({
    name: it.name,
    type: it.type,
    properties: it.properties ?? null,
    level: it.level ?? null,
    school: it.school ?? null,
    description: it.description ?? null,
    material: it.material ?? null,
    target: it.target ?? null,
    affected: it.affected ?? null,
    range: it.range ?? null,
    activation: it.activation ?? null,
    duration: it.duration ?? null,
    image: it.image ?? null,
    compendium_source: it.compendium_source ?? null,
    source_book: it.source_book ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));

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
