import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";

/**
 * ✅ Middleware universal untuk verifikasi JWT (Admin & Ignite)
 * - Baca token dari Authorization header
 * - Pilih secret sesuai payload `app`
 * - Verifikasi JWT dan pastikan user ada di Supabase
 */
export const verifyUserFullAuth = async (req, res, next) => {
  console.log("🧩 [Auth] Verifying user from Authorization header...");

  try {
    // === 1. Ambil token dari header ===
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn("⚠️ [Auth] Missing Authorization header");
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    // Format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Malformed token (missing Bearer)" });
    }

    // === 2. Verifikasi token generik untuk ambil payload mentah ===
    let decoded;
    try {
      decoded = jwt.decode(token);
      if (!decoded) throw new Error("Failed to decode token");
    } catch (err) {
      console.warn("❌ [Auth] Cannot decode token:", err.message);
      return res.status(401).json({ error: "Invalid token structure" });
    }

    // === 3. Tentukan secret berdasarkan payload.app ===
    const app = decoded.app || "ignite"; // default ke ignite kalau tidak ada
    let secret;

    if (app === "admin") {
      secret = process.env.JWT_SECRET_ADMIN;
    } else {
      secret = process.env.JWT_SECRET_USER;
    }

    // === 4. Verifikasi JWT dengan secret yang sesuai ===
    try {
      decoded = jwt.verify(token, secret);
      console.log(`✅ [Auth] ${app.toUpperCase()} token valid:`, decoded.email);
    } catch (err) {
      console.warn(`❌ [Auth] Invalid ${app} JWT:`, err.message);
      return res.status(401).json({
        error: "Invalid or expired token",
        message: err.message,
      });
    }

    // === 5. Cek user di Supabase ===
    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, role")
      .eq("email", decoded.email)
      .single();

    if (error || !data) {
      console.warn(`❌ [Auth] User not found in Supabase:`, decoded.email);
      return res.status(401).json({ error: "User not found in Supabase" });
    }

    // === 6. Role check untuk admin ===
    if (app === "admin" && data.role !== "admin" && data.role !== "superadmin") {
      console.warn("🚫 [Auth] Non-admin user tried to access admin area:", data.email);
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    // === 7. Simpan user ke request ===
    req.user = {
      id: data.id,
      email: data.email,
      username: data.username,
      role: data.role,
      app,
      jwt: decoded,
    };

    console.log(`🚀 [Auth] ${app.toUpperCase()} auth success for ${data.email}`);
    next();
  } catch (err) {
    console.error("🔥 [Auth] verifyUserFullAuth error:", err);
    res.status(500).json({ error: "Server error verifying user" });
  }
};
