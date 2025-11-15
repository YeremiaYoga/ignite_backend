import supabase from "../utils/db.js";

export const upsertUser = async ({ clerkId, email, username, role = "user" }) => {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      [
        {
          clerk_id: clerkId,
          email,
          name: username,
          username,
          role,
        },
      ],
      { onConflict: "clerk_id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("❌ upsertUser error:", error.message);
    throw error;
  }

  return data;
};



export const getUserByClerkId = async (clerkId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .maybeSingle(); 

  if (error) {
    console.error("❌ getUserByClerkId error:", error.message);
    throw error;
  }

  if (!data) {
    console.log("⚠️ No user found for clerkId:", clerkId);
    return null;
  }

  return data;
};


export const updateUserById = async (id, payload) => {
  console.log("🧩 updateUserById attempt:", id, payload);

  const { data, error, status } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  console.log("🧩 Supabase result:", { status, data, error });

  return { data, error };
};

// === JWT-BASED AUTH ADDITIONS ===

export const getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("❌ getUserByEmail error:", error.message);
    throw error;
  }

  return data;
};


export async function upsertUserFromPatreon({
  patreonId,
  email,
  fullName,
  avatarUrl,
  tierName,
}) {
  const PUBLIC_MEDIA_URL = process.env.PUBLIC_MEDIA_URL;
  const DEFAULT_PROFILE = `${PUBLIC_MEDIA_URL}/profile_picture/Candle.webp`;

  // 🔹 Ambil tier "free"
  const { data: freeTier, error: freeError } = await supabase
    .from("tiers")
    .select("id, name, character_limit")
    .eq("slug", "free")
    .maybeSingle();

  if (freeError || !freeTier) {
    console.error("❌ Failed to fetch free tier:", freeError?.message);
    throw new Error("Free tier not found");
  }

  // 🔹 Cari user existing pakai patreon_id / email
  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("*")
    .or(`patreon_id.eq.${patreonId},email.eq.${email}`)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    // PGRST116 = no rows, itu bukan error fatal
    throw existingError;
  }

  // 🆕 Belum ada user → INSERT
  if (!existingUser) {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email,
          name: fullName,
          username: fullName,
          role: "user",

          // 🔐 sumber login
          patreon_id: patreonId,
          clerk_id: null,
          ko_fi_user_id: null,

          // 🎚 tier default (free, tapi nama tier boleh override)
          tier_id: freeTier.id,
          tier: tierName || freeTier.name,
          character_limit: freeTier.character_limit,
          tier_expired_at: null,

          // 🖼 profil
          profile_picture: avatarUrl || DEFAULT_PROFILE,
        },
      ])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("❌ Insert users error:", insertError.message);
      throw insertError;
    }

    return newUser;
  }

  // ♻️ Sudah ada user → UPDATE seperlunya
  const newProfile =
    existingUser.profile_picture &&
    !existingUser.profile_picture.includes("Candle.webp")
      ? existingUser.profile_picture // sudah punya custom foto → jangan diganti
      : avatarUrl || existingUser.profile_picture || DEFAULT_PROFILE;

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({
      patreon_id: patreonId,
      profile_picture: newProfile,
      tier: tierName || existingUser.tier || freeTier.name,
      tier_id: existingUser.tier_id || freeTier.id,
      character_limit:
        existingUser.character_limit || freeTier.character_limit,
    })
    .eq("id", existingUser.id)
    .select()
    .maybeSingle();

  if (updateError) {
    console.error("❌ Update users error:", updateError.message);
    throw updateError;
  }

  return updatedUser;
}