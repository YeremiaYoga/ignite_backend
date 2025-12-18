// models/foundryFeatModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 foundry feat
 */
export async function insertFoundryFeat(payload) {
  const {
    name,
    type = "feat",
    source_book,
    description,
    requirements,
    feat_type,
    subtype,
    properties,
    advancement,
    prerequisites,
    image,
    raw_data,
    format_data,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_feats")
    .insert({
      name,
      type,
      source_book: source_book ?? null,
      description: description ?? null,
      requirements: requirements ?? null,
      feat_type: feat_type ?? null,
      subtype: subtype ?? null,
      properties: properties ?? null,
      advancement: advancement ?? null,
      prerequisites: prerequisites ?? null,
      image: image ?? null,
      raw_data: raw_data ?? {},
      format_data: format_data ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("❌ insertFoundryFeat error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Bulk insert feats
 */
export async function bulkInsertFoundryFeats(items) {
  if (!items?.length) return [];

  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "feat",
    source_book: it.source_book ?? null,
    description: it.description ?? null,
    requirements: it.requirements ?? null,
    feat_type: it.feat_type ?? null,
    subtype: it.subtype ?? null,
    properties: it.properties ?? null,
    advancement: it.advancement ?? null,
    prerequisites: it.prerequisites ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));

  const { data, error } = await supabase
    .from("foundry_feats")
    .insert(mapped)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryFeats error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * List feats dengan pagination
 */
export async function listFoundryFeats({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_feats")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("❌ listFoundryFeats error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * Get detail feat by id
 */
export async function getFoundryFeatById(id) {
  const { data, error } = await supabase
    .from("foundry_feats")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryFeatById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update feat (bisa update format_data, dll)
 */
export async function updateFoundryFeat(id, payload) {
  const { data, error } = await supabase
    .from("foundry_feats")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryFeat error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Delete feat
 */
export async function deleteFoundryFeat(id) {
  const { error } = await supabase
    .from("foundry_feats")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryFeat error:", error.message);
    throw error;
  }

  return true;
}
