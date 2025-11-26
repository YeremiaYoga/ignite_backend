// models/foundryToolModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 foundry tool
 */
export async function insertFoundryTool(payload) {
  const {
    name,
    type = "tool",

    rarity,
    base_item,
    type_value,
    properties,
    weight,
    attunement,

    // 🆕 kolom tambahan
    compendium_source,
    price,
    source_book,

    image, // IMAGE
    raw_data,
    format_data,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_tools")
    .insert({
      name,
      type,

      rarity,
      base_item,
      type_value,
      properties,
      weight,
      attunement,

      // kolom baru
      compendium_source: compendium_source ?? null,
      price: price ?? null,
      source_book: source_book ?? null,

      image: image ?? null,
      raw_data: raw_data ?? {},
      format_data: format_data ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("❌ insertFoundryTool error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Bulk insert
 */
export async function bulkInsertFoundryTools(items) {
  if (!items?.length) return [];

  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "tool",

    rarity: it.rarity ?? null,
    base_item: it.base_item ?? null,
    type_value: it.type_value ?? null,
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    attunement: it.attunement ?? null,

    // kolom baru
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,

    // kalau mau pakai image dari importer, tinggal ganti ke: it.image ?? null
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));

  const { data, error } = await supabase
    .from("foundry_tools")
    .insert(mapped)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryTools error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * List tools
 */
export async function listFoundryTools({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_tools")
    .select("*") // image ikut keluar otomatis
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("❌ listFoundryTools error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * Get detail tool
 */
export async function getFoundryToolById(id) {
  const { data, error } = await supabase
    .from("foundry_tools")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryToolById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update tool
 */
export async function updateFoundryTool(id, payload) {
  const { data, error } = await supabase
    .from("foundry_tools")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryTool error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Delete tool
 */
export async function deleteFoundryTool(id) {
  const { error } = await supabase.from("foundry_tools").delete().eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryTool error:", error.message);
    throw error;
  }

  return true;
}

/**
 * Export tool: raw_data / format_data
 */
export async function exportFoundryTool(id, mode = "raw") {
  const { data, error } = await supabase
    .from("foundry_tools")
    .select("id, name, raw_data, format_data")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ exportFoundryTool error:", error.message);
    throw error;
  }

  if (!data) throw new Error("Tool not found");

  return {
    id: data.id,
    name: data.name,
    exported: mode === "format" ? data.format_data : data.raw_data,
  };
}
