import { getUserByClerkId, updateUserById } from "../models/userModel.js";
import supabase from "../utils/db.js";

/* 🔹 Helper: generate friend code dengan format PI-1234-5678-9012 */
function generateFriendCode() {
  const block = () =>
    String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `PI-${block()}-${block()}-${block()}`;
}

/* 🔹 Helper: pastikan user punya friend_code yang unik */
async function ensureFriendCode(userId) {
  const { data: existing, error: existingErr } = await supabase
    .from("users")
    .select("friend_code")
    .eq("id", userId)
    .single();

  if (existingErr) {
    console.error("❌ Failed to fetch friend_code:", existingErr.message);
    throw existingErr;
  }

  if (existing?.friend_code) return existing.friend_code;

  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    attempt++;
    const code = generateFriendCode();

    const { data, error } = await supabase
      .from("users")
      .update({ friend_code: code })
      .eq("id", userId)
      .select("friend_code")
      .single();

    if (!error && data?.friend_code) {
      console.log(`✅ Friend code generated for user ${userId}: ${data.friend_code}`);
      return data.friend_code;
    }

    const isDuplicate =
      error &&
      (error.code === "23505" ||
        (typeof error.message === "string" &&
          error.message.includes("duplicate key value")));

    if (isDuplicate) {
      console.warn(
        `⚠️ Duplicate friend_code '${code}' on attempt ${attempt}, retrying...`
      );
      continue;
    }

    console.error("❌ Error updating friend_code:", error?.message);
    throw error;
  }

  throw new Error("Failed to generate unique friend code after several attempts");
}

export const listCampaignGenres = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("campaign_genres")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("❌ listCampaignGenres:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load genres" });
  }
};

export const listGameSystems = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("game_systems")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("❌ listGameSystems:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load game systems" });
  }
};

export const logoutUserIgnite = async (req, res) => {
  try {
    const user = req.user;

    res.clearCookie("ignite_access_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    if (user?.id) {
      await supabase
        .from("user_patreon")
        .update({
          access_token: null,
          refresh_token: null,
          expires_in: null,
        })
        .eq("user_id", user.id);
    }

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("❌ Logout error:", err);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
};

export const getUser = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const user = await getUserByClerkId(clerkId);

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error("❌ getUser:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      username,
      profile_picture,

      about_me,
      gender,
      favorite_genre_id,
      favorite_system_id,
    } = req.body;

    if (req.user.role !== "admin" && req.user.id !== id) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot edit this user" });
    }

    const updateData = {};

    // username (kalau dikirim)
    if (username !== undefined) updateData.username = String(username || "").trim();

    // profile picture (kalau dikirim)
    if (profile_picture !== undefined)
      updateData.profile_picture = profile_picture || null;

    // about_me (max 600, plain text)
    if (about_me !== undefined) {
      const v = String(about_me || "");
      if (v.length > 600) {
        return res.status(400).json({ error: "about_me max 600 characters" });
      }
      updateData.about_me = v;
    }

    // gender enum
    if (gender !== undefined) {
      const g = String(gender || "").trim().toLowerCase();
      const allowed = ["male", "female", "other", "rather_not_say"];
      if (!allowed.includes(g)) {
        return res.status(400).json({ error: "Invalid gender" });
      }
      updateData.gender = g;
    }

    // favorites (uuid/null)
    if (favorite_genre_id !== undefined)
      updateData.favorite_genre_id = favorite_genre_id || null;
    if (favorite_system_id !== undefined)
      updateData.favorite_system_id = favorite_system_id || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data, error } = await updateUserById(id, updateData);

    if (error) {
      console.error("❌ updateUser error:", error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log("✅ User updated:", data);
    return res.json({ success: true, user: data });
  } catch (err) {
    console.error("❌ updateUser exception:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

export const getUserMe = async (req, res) => {
  try {
    const { userId } = req;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // default gender safety
    if (data && !data.gender) data.gender = "rather_not_say";

    // (optional) kalau kamu mau pastiin friend_code ada setiap getMe
    // await ensureFriendCode(userId);

    res.json({ user: data });
  } catch (err) {
    console.error("❌ getUserMe error:", err.message);
    res.status(500).json({ error: "Failed to get user" });
  }
};
