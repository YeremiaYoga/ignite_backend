import {
  upsertUser,
  getUserByClerkId,
  updateUserById,
} from "../models/userModel.js";
import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";
export const loginUser = async (req, res) => {
  try {
    const { clerkId, email, username } = req.body;

    if (!clerkId || !email || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const PUBLIC_MEDIA_URL = process.env.PUBLIC_MEDIA_URL;
    const DEFAULT_PROFILE = `${PUBLIC_MEDIA_URL}/profile_picture/Candle.webp`;

    // 🔍 Cek apakah user sudah ada
    let user = await getUserByClerkId(clerkId);

    // 🆕 Jika belum ada user, buat baru
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
              character_limit: 5,
              tier: "free",
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

      // 🧩 Jika user sudah ada tapi belum punya foto → isi default
      if (!user.profile_picture) {
        await supabase
          .from("users")
          .update({ profile_picture: DEFAULT_PROFILE })
          .eq("id", user.id);
        user.profile_picture = DEFAULT_PROFILE;
      }
    }

    if (!user) {
      throw new Error("User creation failed — no data returned from Supabase");
    }

    // 🔐 Buat JWT
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
        app: "ignite",
      },
      process.env.JWT_SECRET_USER,
      { expiresIn: "9h" }
    );

    // 🍪 Cookie
    res.cookie("ignite_access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 9 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
        character_limit: user.character_limit,
        tier: user.tier,
        tier_expired_at: user.tier_expired_at,
        profile_picture: user.profile_picture, // ✅ kirim ke frontend
      },
    });
  } catch (err) {
    console.error("💥 loginUser error:", err);
    return res.status(500).json({ error: err.message });
  }
};



export const logoutUserIgnite = async (req, res) => {
  res.clearCookie("ignite_access_token");
  return res.json({ success: true, message: "Logged out successfully" });
};

// export const loginUser = async (req, res) => {
//   try {
//     const { clerkId, email, username } = req.body;

//     if (!clerkId || !email || !username) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // 🔄 Upsert user ke Supabase
//     const { error: upsertError } = await upsertUser({
//       clerkId,
//       email,
//       username,
//       role: "user",
//     });

//     if (upsertError) {
//       console.error("❌ upsertUser error:", upsertError.message);
//       return res.status(500).json({ error: upsertError.message });
//     }

//     // 🔍 Ambil data user
//     const user = await getUserByClerkId(clerkId);

//     // 🚧 Pastikan role ada
//     if (!user.role) {
//       await updateUserById(user.id, { role: "user" });
//       user.role = "user";
//     }

//     // ✅ Generate JWT (IGNITE)
//     const accessToken = jwt.sign(
//       {
//         id: user.id,
//         email: user.email,
//         username: user.name,
//         role: user.role,
//         app: "ignite", // 👈 penting untuk middleware multi-app
//       },
//       process.env.JWT_SECRET_USER,
//       { expiresIn: "8h" }
//     );

//     // ✅ Kirim response
//     return res.json({
//       success: true,
//       message: "Login successful",
//       user: {
//         id: user.id,
//         email: user.email,
//         username: user.name,
//         role: user.role,
//       },
//       token: accessToken,
//     });
//   } catch (err) {
//     console.error("💥 loginUser error:", err.message);
//     return res.status(500).json({ error: err.message });
//   }
// };

export const getUser = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const user = await getUserByClerkId(clerkId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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

