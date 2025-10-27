import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail } from "../models/userModel.js";

const ACCESS_SECRET = process.env.JWT_SECRET;

/**
 * 🔐 LOGIN USER — Generate only access_token
 */
export const loginUserJWT = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid credentials" });

    // === Buat token ===
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
      },
      ACCESS_SECRET,
      { expiresIn: "8h" } // sesi login 8 jam
    );

    const isProd = process.env.NODE_ENV === "production";

    // === Simpan di cookie ===
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: isProd,                // true untuk HTTPS
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 8 * 60 * 60 * 1000,    // 8 jam
    });

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
    console.error("❌ loginUserJWT error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ VERIFY TOKEN MIDDLEWARE — Untuk proteksi route
 */
export const verifyAccessToken = (req, res, next) => {
  try {
    const token =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ error: "Missing access token" });

    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn("⚠️ Invalid or expired token:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * 🚪 LOGOUT — Hapus cookie token
 */
export const logoutUser = async (req, res) => {
  res.clearCookie("access_token", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return res.json({ success: true, message: "Logged out successfully" });
};
