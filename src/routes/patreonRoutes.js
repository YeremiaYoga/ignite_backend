import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";
import dotenv from "dotenv";
import { upsertUserFromPatreon } from "../models/userModel.js";
dotenv.config();
const router = express.Router();

const CLIENT_ID = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
const REDIRECT_URI = process.env.PATREON_REDIRECT_URI;

// 🔹 1️⃣ Redirect ke Patreon (OAuth start)
router.get("/auth", (req, res) => {
  const { user_id } = req.query;
  const url = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=identity%20identity[email]%20campaigns.members`;
  const state = encodeURIComponent(user_id || "guest");
  res.redirect(`${url}&state=${state}`);
});

// 🔹 2️⃣ Callback dari Patreon
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const user_id = state === "guest" ? null : state; // kalau mau link ke user existing (opsional)

  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    // 1️⃣ Tukar code jadi token
    const tokenRes = await axios.post(
      "https://www.patreon.com/api/oauth2/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // 2️⃣ Ambil data user Patreon
    const userRes = await axios.get(
      "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Buser%5D=full_name,email,image_url",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const patreonUser = userRes.data?.data;
    const patreonId = patreonUser?.id;
    const email = patreonUser?.attributes?.email || null;
    const fullName = patreonUser?.attributes?.full_name || "Patreon User";
    const avatarUrl = patreonUser?.attributes?.image_url || null;

    const membership = userRes.data?.included?.[0];
    const tierName = membership?.attributes?.patron_status || "free";
    const tierAmount = membership?.attributes?.currently_entitled_amount_cents
      ? membership.attributes.currently_entitled_amount_cents / 100
      : 0;
    const membershipStatus = membership?.attributes?.patron_status || "free";

    // 3️⃣ Upsert ke user_patreon (link akun)
    const { data: existingPatreon } = await supabase
      .from("user_patreon")
      .select("id")
      .eq("patreon_id", patreonId)
      .maybeSingle();

    if (existingPatreon) {
      await supabase
        .from("user_patreon")
        .update({
          user_id,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          tier_name: tierName,
          tier_amount: tierAmount,
          membership_status: membershipStatus,
          access_token,
          refresh_token,
          expires_in,
          patreon_data: userRes.data,
          updated_at: new Date().toISOString(),
        })
        .eq("patreon_id", patreonId);
    } else {
      await supabase.from("user_patreon").insert([
        {
          user_id,
          patreon_id: patreonId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          tier_name: tierName,
          tier_amount: tierAmount,
          membership_status: membershipStatus,
          access_token,
          refresh_token,
          expires_in,
          patreon_data: userRes.data,
          updated_at: new Date().toISOString(),
        },
      ]);
    }

    const finalUser = await upsertUserFromPatreon({
      patreonId,
      email,
      fullName,
      avatarUrl,
      tierName,
    });

    // 5️⃣ Generate token JWT
    const accessTokenJWT = jwt.sign(
      {
        id: finalUser.id,
        email: finalUser.email,
        username: finalUser.name,
        role: finalUser.role,
        app: "ignite",
      },
      process.env.JWT_SECRET_USER,
      { expiresIn: "9h" }
    );

    res.cookie("ignite_access_token", accessTokenJWT, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 9 * 60 * 60 * 1000,
    });

    // ✅ Redirect ke frontend
    res.redirect(`${process.env.REDIRECT_PATREON_DOMAIN}/patreon-success`);
  } catch (err) {
    console.error("❌ Patreon callback error (details):");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error("Message:", err.message);
    }
    res.status(500).json({ error: "Patreon authentication failed" });
  }
});

// 🔹 Fetch data Patreon link
router.get("/user/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const { data, error } = await supabase
      .from("user_patreon")
      .select(
        "patreon_id, email, full_name, avatar_url, tier_name, membership_status"
      )
      .eq("user_id", user_id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    if (!data)
      return res.status(404).json({ message: "No Patreon account linked." });

    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching Patreon user:", err.message);
    res.status(500).json({ error: "Failed to fetch Patreon user data" });
  }
});

export default router;
