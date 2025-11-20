// models/foundryWeaponModel.js
import supabase from "../utils/db.js";

/**
 * Insert 1 foundry weapon
 */
export async function insertFoundryWeapon({ name, type = "weapon", rawData, formatData }) {
  const { data, error } = await supabase
    .from("foundry_weapons")
    .insert({
      name,
      type,
      raw_data: rawData,
      format_data: formatData,
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
 * Bulk insert (dipakai waktu import banyak)
 */
export async function bulkInsertFoundryWeapons(items) {
  if (!items?.length) return [];

  const { data, error } = await supabase
    .from("foundry_weapons")
    .insert(
      items.map((it) => ({
        name: it.name,
        type: it.type || "weapon",
        raw_data: it.rawData,
        format_data: it.formatData,
      }))
    )
    .select();

  if (error) {
    console.error("❌ bulkInsertFoundryWeapons error:", error.message);
    throw error;
  }

  return data || [];
}

/**
 * List weapon (simple, dengan pagination)
 */
export async function listFoundryWeapons({ limit = 50, offset = 0 } = {}) {
  const from = offset;
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from("foundry_weapons")
    .select("id, name, type, created_at")
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
    .select("id, name, type, raw_data, format_data, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ getFoundryWeaponById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Update format_data saja (kalau nanti kamu mau edit di admin)
 */
export async function updateFoundryWeaponFormat(id, formatData) {
  const { data, error } = await supabase
    .from("foundry_weapons")
    .update({
      format_data: formatData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ updateFoundryWeaponFormat error:", error.message);
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


export async function exportFoundryWeapon(id, mode = "raw") {
  const { data, error } = await supabase
    .from("foundry_weapons")
    .select("id, name, raw_data, format_data")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ exportFoundryWeapon error:", error.message);
    throw error;
  }

  if (!data) throw new Error("Weapon not found");

  return {
    id: data.id,
    name: data.name,
    exported:
      mode === "format"
        ? data.format_data
        : data.raw_data,
  };
}