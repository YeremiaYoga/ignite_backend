import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail } from "../models/userModel.js";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/* === LOGIN JWT (Access + Refresh Token) === */
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

    // === BUAT TOKEN ===
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.name, role: user.role },
      ACCESS_SECRET,
      { expiresIn: "15m" } // access token hidup 15 menit
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      REFRESH_SECRET,
      { expiresIn: "7d" } // refresh token hidup 7 hari
    );

    // === SIMPAN DI COOKIE ===
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

/* === REFRESH ACCESS TOKEN === */
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken)
      return res.status(401).json({ error: "No refresh token" });

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ refreshAccessToken error:", err.message);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
};

/* === LOGOUT === */
export const logoutUser = async (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  return res.json({ success: true, message: "Logged out successfully" });
};
