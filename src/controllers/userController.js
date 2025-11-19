import {
  upsertUser,
  getUserByClerkId,
  updateUserById,
} from "../models/userModel.js";
import jwt from "jsonwebtoken";

import supabase from "../utils/db.js";

/* 🔹 Helper: generate friend code dengan format PI-1234-5678-9012 */
function generateFriendCode() {
  const block = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `PI-${block()}-${block()}-${block()}`;
}

/* 🔹 Helper: pastikan user punya friend_code yang unik */
async function ensureFriendCode(userId) {
  // cek dulu: kalau sudah punya, langsung pakai
  const { data: existing, error: existingErr } = await supabase
    .from("users")
    .select("friend_code")
    .eq("id", userId)
    .single();

  if (existingErr) {
    console.error("❌ Failed to fetch friend_code:", existingErr.message);
    throw existingErr;
  }

  if (existing?.friend_code) {
    return existing.friend_code;
  }

  // belum ada → generate + update, handle kemungkinan duplicate
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
      (error.code === "23505" || // Postgres unique_violation
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

export const loginUser = async (req, res) => {
  try {
    const { clerkId, email, username } = req.body;
    if (!clerkId || !email || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const PUBLIC_MEDIA_URL = process.env.PUBLIC_MEDIA_URL;
    const DEFAULT_PROFILE = `${PUBLIC_MEDIA_URL}/profile_picture/Candle.webp`;

    const { data: freeTier, error: freeError } = await supabase
      .from("tiers")
      .select("id, name, character_limit")
      .eq("slug", "free")
      .maybeSingle();

    if (freeError || !freeTier) {
      console.error("❌ Failed to fetch free tier:", freeError?.message);
      return res.status(500).json({ error: "Free tier not found" });
    }

    let user = await getUserByClerkId(clerkId);

    if (!user) {
      console.log("🆕 New user detected, creating...");

      const { data, error: upsertError } = await supabase
        .from("users")
        .upsert(
          [
            {
              clerk_id: clerkId,
              email,
              name: username,
              username,
              role: "user",
              tier_id: freeTier.id,
              tier: freeTier.name,
              character_limit: freeTier.character_limit,
              tier_expired_at: null,
              profile_picture: DEFAULT_PROFILE, // 🖼️ default Candle.webp
            },
          ],
          { onConflict: "clerk_id" }
        )
        .select()
        .maybeSingle();

      if (upsertError) {
        console.error("❌ upsertUser error:", upsertError.message);
        return res.status(500).json({ error: upsertError.message });
      }

      user = data;
    } else {
      console.log("⚡ Existing user found:", user.email);

      // 🧩 Jika belum punya tier, pastikan terhubung ke Free
      if (!user.tier_id) {
        await supabase
          .from("users")
          .update({
            tier_id: freeTier.id,
            tier: freeTier.name,
            character_limit: freeTier.character_limit,
            tier_expired_at: null,
          })
          .eq("id", user.id);
        user.tier_id = freeTier.id;
        user.tier = freeTier.name;
        user.character_limit = freeTier.character_limit;
      }

      // 🧩 Jika user belum punya foto profil → isi default
      if (!user.profile_picture) {
        await supabase
          .from("users")
          .update({ profile_picture: DEFAULT_PROFILE })
          .eq("id", user.id);
        user.profile_picture = DEFAULT_PROFILE;
      }
    }

    // 🔹 Pastikan user punya friend_code (unik, format PI-XXXX-XXXX-XXXX)
    const friendCode = await ensureFriendCode(user.id);
    user.friend_code = friendCode;

    // 🔐 Buat JWT
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
        app: "ignite",
        friend_code: user.friend_code, // optional, kalau mau di pakai di client
      },
      process.env.JWT_SECRET_USER,
      { expiresIn: "9h" }
    );

    // 🍪 Kirim cookie
    res.cookie("ignite_access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 9 * 60 * 60 * 1000, // 9 jam
    });

    // 🎯 Respon ke frontend
    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
        tier_id: user.tier_id,
        tier: user.tier,
        character_limit: user.character_limit,
        tier_expired_at: user.tier_expired_at,
        profile_picture: user.profile_picture,
        friend_code: user.friend_code, // 🔹 kirim ke frontend
      },
    });
  } catch (err) {
    console.error("💥 loginUser error:", err);
    return res.status(500).json({ error: err.message });
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

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // user di sini sudah termasuk friend_code kalau ada di kolom users
    return res.json({ user });
  } catch (err) {
    console.error("❌ getUser:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, profile_picture } = req.body;

    console.log("🟢 PATCH /users:", { id, username, profile_picture });

    // 🔐 Pastikan user hanya bisa ubah dirinya sendiri, kecuali admin
    if (req.user.role !== "admin" && req.user.id !== id) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot edit this user" });
    }

    // 🧩 Siapkan data yang akan di-update
    const updateData = {};
    if (username) updateData.username = username.trim();
    if (profile_picture) updateData.profile_picture = profile_picture;

    // 🚧 Validasi jika tidak ada field dikirim
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // 🪄 Jalankan update ke Supabase
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

    // di sini juga sudah termasuk friend_code kalau kolomnya ada
    res.json({ user: data });
  } catch (err) {
    console.error("❌ getUserMe error:", err.message);
    res.status(500).json({ error: "Failed to get user" });
  }
};
