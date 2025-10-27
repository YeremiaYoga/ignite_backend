import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail } from "../models/userModel.js";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// 🔧 Cookie configuration helper
const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,                 // true hanya jika https
  sameSite: isProd ? "none" : "lax", // 'none' agar lintas domain, 'lax' aman untuk localhost
};

// kalau kamu lintas subdomain (misal api.talesofdasaron.web.id vs projectignite.talesofdasaron.web.id)
if (isProd) cookieOptions.domain = ".talesofdasaron.web.id";

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

    // 🔑 Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.name, role: user.role },
      ACCESS_SECRET,
      { expiresIn: "8h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // 🍪 Set cookies konsisten
    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000, // 8 jam
    });

    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
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

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken)
      return res.status(401).json({ error: "No refresh token" });

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    // 🔁 Buat access token baru
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      ACCESS_SECRET,
      { expiresIn: "8h" }
    );

    // 🍪 Set cookie baru dengan config yang sama
    res.cookie("access_token", newAccessToken, {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000,
    });

    console.log("✅ Access token refreshed successfully");
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ refreshAccessToken error:", err.message);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
};

export const logoutUser = async (req, res) => {
  res.clearCookie("access_token", cookieOptions);
  res.clearCookie("refresh_token", cookieOptions);
  return res.json({ success: true, message: "Logged out successfully" });
};
