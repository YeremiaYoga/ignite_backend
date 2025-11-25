// models/foundryLootModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 loot
 */
export async function insertFoundryLoot(payload) {
  const {
    name,
    type,
    type_value,
    base_item,
    properties,
    rarity,
    weight,
    image,
    price,
    compendium_source,
    source_book,
    raw_data,
    format_data,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_loots")
    .insert({
      name,
      type,
      type_value,
      base_item,
      properties,
      rarity,
      weight,
      image,
      price,
      compendium_source,
      source_book,
      raw_data: raw_data ?? {},
      format_data: format_data ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("❌ insertFoundryLoot error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Bulk insert loots
 */
export async function bulkInsertFoundryLoots(items) {
  if (!items?.length) return [];

  const rows = items.map((it) => ({
    name: it.name,
    type: it.type,
    type_value: it.type_value ?? null,
    base_item: it.base_item ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,
    weight: it.weight ?? null,
    image: it.image ?? null,
    price: it.price ?? null,
    compendium_source: it.compendium_source ?? null,
    source_book: it.source_book ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));

  const { data, error } = await supabase
    .from("foundry_loots")
    .insert(rows)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryLoots error:", error.message);
    throw error;
  }

  return data;
}

/**
 * List loots
 */
export async function listFoundryLoots({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("foundry_loots")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("❌ listFoundryLoots error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Get loot by id
 */
export async function getFoundryLootById(id) {
  const { data, error } = await supabase
    .from("foundry_loots")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryLootById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update loot (format / any columns)
 */
export async function updateFoundryLoot(id, payload) {
  const { data, error } = await supabase
    .from("foundry_loots")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryLoot error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Delete loot
 */
export async function deleteFoundryLoot(id) {
  const { error } = await supabase
    .from("foundry_loots")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryLoot error:", error.message);
    throw error;
  }
}
