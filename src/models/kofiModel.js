// src/models/kofiModel.js
import supabase from "../utils/db.js";

/**
 * Simpan log dari webhook Ko-fi ke tabel kofi_logs
 */
export const insertKofiLog = async (payload, verified = false) => {
  const { data, error } = await supabase.from("kofi_logs").insert([
    {
      kofi_user_id: payload.supporter_user_id || null,
      kofi_user_name: payload.from_name || null,
      type: payload.type || null,
      message: payload.message || null,
      amount: payload.amount || null,
      currency: payload.currency || null,
      membership_tier: payload.tier_name || null,
      raw_payload: payload,
      verified,
    },
  ]);

  if (error) {
    console.error("❌ insertKofiLog error:", error.message);
    throw error;
  }

  return data;
};

/**
 * Ambil semua log Ko-fi
 */
export const getAllKofiLogs = async () => {
  const { data, error } = await supabase
    .from("kofi_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ getAllKofiLogs error:", error.message);
    throw error;
  }

  return data;
};
