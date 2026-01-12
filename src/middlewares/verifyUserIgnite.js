import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";

function getTokenFromReq(req) {
  // 1) Cookie (utama)
  const cookieToken = req.cookies?.ignite_access_token;
  if (cookieToken) return cookieToken;

  // 2) Authorization header
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth) return null;

  // Support: "Bearer xxx" atau "xxx"
  const parts = String(auth).trim().split(" ");
  if (parts.length === 1) return parts[0];
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) return parts[1];

  return null;
}

export const verifyUserIgnite = async (req, res, next) => {
  try {
    console.log("🧩 [Auth] Starting verifyUserIgnite...");

    const token = getTokenFromReq(req);

    if (!token) {
      console.warn("⚠️ [Auth] Missing token (cookie or Authorization).");
      return res.status(401).json({ error: "Missing access token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_USER);
      console.log("✅ [Auth] Token verified:", decoded.email);
    } catch (err) {
      console.warn("❌ [Auth] Invalid JWT:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, role")
      .eq("id", decoded.id)
      .maybeSingle();

    if (error || !data) {
      console.warn("❌ [Auth] User not found:", decoded.email);
      return res.status(401).json({ error: "User not found in Supabase" });
    }

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
