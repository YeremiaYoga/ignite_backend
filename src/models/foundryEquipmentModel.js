// models/foundryEquipmentModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 equipment
 */
export async function insertFoundryEquipment(payload) {
  const {
    name,
    type = "equipment",

    type_value,
    base_item,
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
    .from("foundry_equipments")
    .insert({
      name,
      type,

      type_value: type_value ?? null,
      base_item: base_item ?? null,
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
    console.error("❌ insertFoundryEquipment error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Bulk insert
 */
export async function bulkInsertFoundryEquipments(items) {
  if (!items?.length) return [];

  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "equipment",

    type_value: it.type_value ?? null,
    base_item: it.base_item ?? null,
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
    .from("foundry_equipments")
    .insert(mapped)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryEquipments error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * List equipments
 */
export async function listFoundryEquipments({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_equipments")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("❌ listFoundryEquipments error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * Get detail
 */
export async function getFoundryEquipmentById(id) {
  const { data, error } = await supabase
    .from("foundry_equipments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryEquipmentById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update
 */
export async function updateFoundryEquipment(id, payload) {
  const { data, error } = await supabase
    .from("foundry_equipments")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryEquipment error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Delete
 */
export async function deleteFoundryEquipment(id) {
  const { error } = await supabase
    .from("foundry_equipments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryEquipment error:", error.message);
    throw error;
  }

  return true;
}

/**
 * Export raw/format
 */
export async function exportFoundryEquipment(id) {
  const { data, error } = await supabase
    .from("foundry_equipments")
    .select("id, name, raw_data, format_data")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ exportFoundryEquipment error:", error.message);
    throw error;
  }

  if (!data) throw new Error("Equipment not found");

  return data;
}
