import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";

export const verifyUserFullAuth = async (req, res, next) => {
  console.log("🧩 [Auth] Verifying user from Authorization header...");

  try {
    // === 1. Ambil token dari header
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    console.log(authHeader);
    // Format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ error: "Malformed token (missing Bearer)" });
    }

    // === 2. Verifikasi JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ [Auth] Token valid:", decoded.email);
    } catch (err) {
      console.warn("❌ [Auth] Invalid JWT:", err.message);
      return res
        .status(401)
        .json({ error: "Invalid or expired token", message: err.message });
    }

    // === 3. (Opsional) Cek user di Supabase
    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, role")
      .eq("email", decoded.email)
      .single();

    if (error || !data) {
      console.warn("❌ [Auth] User not found:", error?.message);
      return res.status(401).json({ error: "User not found in Supabase" });
    }

    // === 4. Simpan user di req untuk route berikutnya
    req.user = {
      id: data.id,
      email: data.email,
      username: data.username,
      role: data.role,
      jwt: decoded,
    };

    console.log("🚀 [Auth] Auth success for", data.email);
    next();
  } catch (err) {
    console.error("🔥 [Auth] verifyUserFullAuth error:", err);
    res.status(500).json({ error: "Server error verifying user" });
  }
};
