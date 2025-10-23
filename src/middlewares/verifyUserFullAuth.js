import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";

export const verifyUserFullAuth = async (req, res, next) => {
  try {
    console.log("🧩 [Auth] Starting verifyUserFullAuth...");

    const token =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      console.warn("⚠️ [Auth] No access token found.");
      return res.status(401).json({ error: "Missing access token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ [Auth] JWT verified:", decoded.email);
    } catch (err) {
      console.warn("❌ [Auth] Invalid JWT:", err.message);
      return res.status(401).json({ error: "Invalid or expired JWT" });
    }

    console.log("🔍 [Auth] Checking Supabase for user:", decoded.email);
    const { data, error } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("email", decoded.email)
      .single();

    if (error || !data) {
      console.warn("❌ [Auth] User not found in Supabase:", error?.message);
      return res.status(401).json({ error: "User not found in Supabase" });
    }

    console.log("✅ [Auth] User verified in Supabase:", data.email);

    req.user = {
      id: data.id,
      email: data.email,
      username: data.username || "Unknown User",
      jwt: decoded,
    };

    req.userId = data.id;

    console.log("🚀 [Auth] Verification passed. Proceeding...");
    next();
  } catch (err) {
    console.error("🔥 [Auth] verifyUserFullAuth error:", err);
    res.status(500).json({ error: "Server error verifying user" });
  }
};
