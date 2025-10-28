import {
  upsertUser,
  getUserByClerkId,
  updateUserById,
} from "../models/userModel.js";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET_USER;
export const loginUser = async (req, res) => {
  try {
    const { clerkId, email, username } = req.body;

    if (!clerkId || !email || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔄 Upsert user ke Supabase
    const { error: upsertError } = await upsertUser({
      clerkId,
      email,
      username,
      role: "user",
    });

    if (upsertError) {
      console.error("❌ upsertUser error:", upsertError.message);
      return res.status(500).json({ error: upsertError.message });
    }

    // 🔍 Ambil data user
    const user = await getUserByClerkId(clerkId);

    // 🚧 Pastikan role ada
    if (!user.role) {
      await updateUserById(user.id, { role: "user" });
      user.role = "user";
    }

    // ✅ Generate JWT untuk IGNITE
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
        app: "ignite", // penanda untuk middleware
      },
      process.env.JWT_SECRET_USER,
      { expiresIn: "9h" }
    );

    // ✅ Set cookie HTTP-only
    res.cookie("ignite_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 9 * 60 * 60 * 1000, // 9 jam
    });

    // ✅ Response
    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("💥 loginUser error:", err.message);
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
    const { username } = req.body;

    console.log("🟢 PATCH /users:", { id, username });

    const { data, error } = await updateUserById(id, { username });

    if (error) {
      console.error("❌ updateUser error:", error.message);
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true, user: data });
  } catch (err) {
    console.error("❌ updateUser exception:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
