import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail } from "../models/userModel.js";

const ACCESS_SECRET = process.env.JWT_SECRET_ADMIN;

/**
 * 🔐 LOGIN USER — Generate JWT dan kirim ke frontend
 */
export const loginAdminJWT = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid credentials" });

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied: Admins only" });
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
        app: "admin", 
      },
      process.env.JWT_SECRET_ADMIN,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      message: "Admin login successful",
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ loginAdminJWT error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ✅ VERIFY TOKEN — Middleware untuk proteksi route
 */
export const verifyAccessToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "No Authorization header" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn("⚠️ Invalid or expired token:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * 🚪 LOGOUT — Hapus token di sisi frontend (tidak perlu dari server)
 */
export const logoutUser = async (req, res) => {
  return res.json({ success: true, message: "Logged out successfully" });
};
