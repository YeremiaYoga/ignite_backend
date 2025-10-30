import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";


export const verifyUserFullAuth = async (req, res, next) => {
  console.log("🧩 [Auth] Verifying user from Authorization header...");

  try {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn("⚠️ [Auth] Missing Authorization header");
      return res.status(401).json({ error: "Missing Authorization header" });
    }


    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Malformed token (missing Bearer)" });
    }

    let decoded;
    try {
      decoded = jwt.decode(token);
      if (!decoded) throw new Error("Failed to decode token");
    } catch (err) {
      console.warn("❌ [Auth] Cannot decode token:", err.message);
      return res.status(401).json({ error: "Invalid token structure" });
    }

    const app = decoded.app || "ignite"; 
    let secret;

    if (app === "admin") {
      secret = process.env.JWT_SECRET_ADMIN;
    } else {
      secret = process.env.JWT_SECRET_USER;
    }

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

    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, role")
      .eq("email", decoded.email)
      .single();

    if (error || !data) {
      console.warn(`❌ [Auth] User not found in Supabase:`, decoded.email);
      return res.status(401).json({ error: "User not found in Supabase" });
    }

    if (app === "admin" && data.role !== "admin" && data.role !== "superadmin") {
      console.warn("🚫 [Auth] Non-admin user tried to access admin area:", data.email);
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

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
