// models/foundryFeatureModel.js
import supabase from "../utils/db.js";

export async function insertFoundryFeature(payload) {
  const {
    name,
    type,

    image,
    description,

    raw_data,
    format_data,

    favorites,
    favorites_count,

    prerequisites,
    properties,
    requirements,
    uses,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_features")
    .insert({
      name,
      type,
      image: image ?? null,
      description: description ?? null,

      raw_data: raw_data ?? {},
      format_data: format_data ?? {},

      favorites: favorites ?? [],
      favorites_count: typeof favorites_count === "number" ? favorites_count : 0,

      prerequisites: prerequisites ?? {},
      properties: properties ?? [],
      requirements: requirements ?? null,
      uses: uses ?? {},
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

  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type,

    image: it.image ?? null,
    description: it.description ?? null,

    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},

    favorites: it.favorites ?? [],
    favorites_count: typeof it.favorites_count === "number" ? it.favorites_count : 0,

    prerequisites: it.prerequisites ?? {},
    properties: it.properties ?? [],
    requirements: it.requirements ?? null,
    uses: it.uses ?? {},
  }));

  const { data, error } = await supabase
    .from("foundry_features")
    .insert(mapped)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryFeatures error:", error.message);
    throw error;
  }

  return data || [];
}

export async function listFoundryFeatures({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_features")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("❌ listFoundryFeatures error:", error.message);
    throw error;
  }

  return data || [];
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
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
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

  return true;
}
