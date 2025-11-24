// models/foundryContainerModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 container
 */
export async function insertFoundryContainer(payload) {
  const {
    name,
    type = "container",

    properties,
    weight,
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
    .from("foundry_containers")
    .insert({
      name,
      type,

      properties: properties ?? null,
      weight: weight ?? null,
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
    console.error("❌ insertFoundryContainer error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Bulk insert
 */
export async function bulkInsertFoundryContainers(items) {
  if (!items?.length) return [];

  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "container",

    properties: it.properties ?? null,
    weight: it.weight ?? null,
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
    .from("foundry_containers")
    .insert(mapped)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryContainers error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * List containers
 */
export async function listFoundryContainers({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_containers")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("❌ listFoundryContainers error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * Get detail
 */
export async function getFoundryContainerById(id) {
  const { data, error } = await supabase
    .from("foundry_containers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryContainerById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update
 */
export async function updateFoundryContainer(id, payload) {
  const { data, error } = await supabase
    .from("foundry_containers")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryContainer error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Delete
 */
export async function deleteFoundryContainer(id) {
  const { error } = await supabase
    .from("foundry_containers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryContainer error:", error.message);
    throw error;
  }

  return true;
}

/**
 * Export raw/format
 */
export async function exportFoundryContainer(id) {
  const { data, error } = await supabase
    .from("foundry_containers")
    .select("id, name, raw_data, format_data")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ exportFoundryContainer error:", error.message);
    throw error;
  }

  if (!data) throw new Error("Container not found");

  return data;
}
