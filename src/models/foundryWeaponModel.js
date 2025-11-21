// models/foundryWeaponModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 foundry weapon
 */
export async function insertFoundryWeapon(payload) {
  const {
    name,
    type = "weapon",

    rarity,
    base_item,
    weapon_type,
    damage_type,
    attunement,
    properties,
    weight,
    mastery,
  } = payload;

  const { data, error } = await supabase
    .from("foundry_weapons")
    .insert({
      name,
      type,

      rarity,
      base_item,
      weapon_type,
      damage_type,
      attunement,
      properties,
      weight,
      mastery,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ insertFoundryWeapon error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Bulk insert
 */
export async function bulkInsertFoundryWeapons(items) {
  if (!items?.length) return [];

  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "weapon",

    rarity: it.rarity ?? null,
    base_item: it.base_item ?? null,
    weapon_type: it.weapon_type ?? null,
    damage_type: it.damage_type ?? null,
    attunement: it.attunement ?? null,
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    mastery: it.mastery ?? null,
  }));

  const { data, error } = await supabase
    .from("foundry_weapons")
    .insert(mapped)
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryWeapons error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * List weapon
 */
export async function listFoundryWeapons({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to   = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_weapons")
    .select(
      "id, name, type, rarity, base_item, weapon_type, mastery, created_at"
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("❌ listFoundryWeapons error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * Get detail weapon
 */
export async function getFoundryWeaponById(id) {
  const { data, error } = await supabase
    .from("foundry_weapons")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryWeaponById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update weapon (bisa edit semua kolom kecuali id)
 */
export async function updateFoundryWeapon(id, payload) {
  const { data, error } = await supabase
    .from("foundry_weapons")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryWeapon error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Delete weapon
 */
export async function deleteFoundryWeapon(id) {
  const { error } = await supabase
    .from("foundry_weapons")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ deleteFoundryWeapon error:", error.message);
    throw error;
  }

  return true;
}
