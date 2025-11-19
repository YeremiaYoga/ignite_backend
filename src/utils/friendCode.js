// utils/friendCode.js
import supabase from "../utils/db.js";

/**
 * Generate 4 digit block (0000-9999)
 */
function randomBlock() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

/**
 * Generate raw PI-XXXX-XXXX-XXXX
 */
function generateRawCode() {
  return `PI-${randomBlock()}-${randomBlock()}-${randomBlock()}`;
}

/**
 * Generate UNIQUE friend code
 * - Check database users.friend_code
 * - Retry if duplicate
 */
export async function generateUniqueFriendCode() {
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    const code = generateRawCode();

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("friend_code", code)
      .maybeSingle();

    // kalau tidak ada user yang punya kode ini → aman
    if (!data) {
      return code;
    }

    console.warn(`⚠️ Duplicate friend_code detected: ${code}, retrying... (${attempts})`);
  }

  throw new Error("Failed to generate unique friend code after multiple attempts");
}
