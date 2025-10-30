import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";


export const verifyUserIgnite = async (req, res, next) => {
  try {
    console.log("🧩 [Auth] Starting verifyUserIgnite...");

    const token =
      req.cookies?.ignite_access_token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      console.warn("⚠️ [Auth] Missing ignite_access_token.");
      return res.status(401).json({ error: "Missing access token" });
    }

    // === 2️⃣ Verifikasi JWT ===
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_USER);
      console.log("✅ [Auth] Token verified:", decoded.email);
    } catch (err) {
      console.warn("❌ [Auth] Invalid JWT:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // === 3️⃣ Validasi user di Supabase ===
    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, role")
      .eq("email", decoded.email)
      .single();

    if (error || !data) {
      console.warn("❌ [Auth] User not found:", decoded.email);
      return res.status(401).json({ error: "User not found in Supabase" });
    }

    // === 4️⃣ Attach ke req untuk controller berikutnya ===
    req.user = {
      id: data.id,
      email: data.email,
      username: data.username || "Unknown",
      role: data.role || "user",
      jwt: decoded,
    };
    req.userId = data.id;

    console.log(`🚀 [Auth] Verified user: ${data.email}`);
    next();
  } catch (err) {
    console.error("🔥 [Auth] verifyUserIgnite error:", err);
    res.status(500).json({ error: "Server error verifying user" });
  }
};
