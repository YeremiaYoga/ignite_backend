// models/foundryFeatureModel.js
import supabase from "../utils/db.js";

export async function insertFoundryFeature(payload) {
  const {
    name,
    type,
    image,
    compendium_source,
    source_book,
    description,
    raw_data,
    format_data,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_features")
    .insert({
      name,
      type,
      image,
      compendium_source,
      source_book,
      description,
      raw_data: raw_data ?? {},
      format_data: format_data ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("❌ insertFoundryFeature error:", error.message);
    throw error;
  }

  return data;
}

export async function bulkInsertFoundryFeatures(items) {
  if (!items?.length) return [];

  const rows = items.map((it) => ({
    name: it.name,
    type: it.type,
    image: it.image ?? null,
    compendium_source: it.compendium_source ?? null,
    source_book: it.source_book ?? null,
    description: it.description ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));

  const { data, error } = await supabase
    .from("foundry_features")
    .insert(rows)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryFeatures error:", error.message);
    throw error;
  }

  return data;
}

export async function listFoundryFeatures({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("foundry_features")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("❌ listFoundryFeatures error:", error.message);
    throw error;
  }

  return data;
}

export async function getFoundryFeatureById(id) {
  const { data, error } = await supabase
    .from("foundry_features")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryFeatureById error:", error.message);
    throw error;
  }

  return data;
}

export async function updateFoundryFeature(id, payload) {
  const { data, error } = await supabase
    .from("foundry_features")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryFeature error:", error.message);
    throw error;
  }

  return data;
}

export async function deleteFoundryFeature(id) {
  const { error } = await supabase
    .from("foundry_features")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryFeature error:", error.message);
    throw error;
  }
}
