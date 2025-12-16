import supabase from "../utils/db.js";

export const upsertUser = async ({
  clerkId,
  email,
  username,
  role = "user",
}) => {
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

  let freeTier = null;

  try {
    const { data, error } = await supabase
      .from("tiers")
      .select("id, name, character_limit")
      .eq("slug", "free")
      .maybeSingle();

    if (error) {
      console.error("⚠️ Failed to fetch free tier:", error.message);
    } else if (!data) {
      console.warn("⚠️ Free tier not found in tiers table");
    } else {
      freeTier = data;
    }
  } catch (e) {
    console.error("⚠️ Exception while fetching free tier:", e.message);
  }

  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("*")
    .or(`patreon_id.eq.${patreonId},email.eq.${email}`)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    console.error(
      "❌ upsertUserFromPatreon - find existing user error:",
      existingError.message
    );
    throw existingError;
  }

  const fallbackTierName = tierName || freeTier?.name || "Free";
  const fallbackCharLimit = freeTier?.character_limit ?? 12;
  const fallbackTierId = freeTier?.id ?? null;
  if (!existingUser) {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email,
          name: fullName,
          username: fullName,
          role: "user",
          patreon_id: patreonId,
          clerk_id: null,
          ko_fi_user_id: null,
          tier_id: fallbackTierId,
          tier: fallbackTierName,
          character_limit: fallbackCharLimit,
          tier_expired_at: null,
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

  const newProfile =
    existingUser.profile_picture &&
    !existingUser.profile_picture.includes("Candle.webp")
      ? existingUser.profile_picture
      : avatarUrl || existingUser.profile_picture || DEFAULT_PROFILE;

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({
      patreon_id: patreonId,
      profile_picture: newProfile,
      tier: fallbackTierName || existingUser.tier,
      tier_id: existingUser.tier_id || fallbackTierId,
      character_limit: existingUser.character_limit || fallbackCharLimit,
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
