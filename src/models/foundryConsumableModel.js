// models/foundryConsumableModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 consumable
 */
export async function insertFoundryConsumable(payload) {
  const {
    name,
    type = "consumable",

    type_value,
    subtype,
    weight,
    properties,
    rarity,

    compendium_source,
    price,
    source_book,

    attunement,
    image,

    raw_data,
    format_data,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_consumables")
    .insert({
      name,
      type,

      type_value: type_value ?? null,
      subtype: subtype ?? null,
      weight: weight ?? null,
      properties: properties ?? null,
      rarity: rarity ?? null,

      compendium_source: compendium_source ?? null,
      price: price ?? null,
      source_book: source_book ?? null,

      attunement: attunement ?? null,
      image: image ?? null,

      raw_data: raw_data ?? {},
      format_data: format_data ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("❌ insertFoundryConsumable error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Bulk insert
 */
export async function bulkInsertFoundryConsumables(items) {
  if (!items?.length) return [];

  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "consumable",

    type_value: it.type_value ?? null,
    subtype: it.subtype ?? null,
    weight: it.weight ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,

    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,

    attunement: it.attunement ?? null,
    image: it.image ?? null,

    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));

  const { data, error } = await supabase
    .from("foundry_consumables")
    .insert(mapped)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryConsumables error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * List consumables
 */
export async function listFoundryConsumables({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_consumables")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("❌ listFoundryConsumables error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * Get detail
 */
export async function getFoundryConsumableById(id) {
  const { data, error } = await supabase
    .from("foundry_consumables")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryConsumableById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update
 */
export async function updateFoundryConsumable(id, payload) {
  const { data, error } = await supabase
    .from("foundry_consumables")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryConsumable error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Delete
 */
export async function deleteFoundryConsumable(id) {
  const { error } = await supabase
    .from("foundry_consumables")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryConsumable error:", error.message);
    throw error;
  }

  return true;
}

/**
 * Export raw/format
 */
export async function exportFoundryConsumable(id) {
  const { data, error } = await supabase
    .from("foundry_consumables")
    .select("id, name, raw_data, format_data")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ exportFoundryConsumable error:", error.message);
    throw error;
  }

  if (!data) throw new Error("Consumable not found");

  return data;
}
