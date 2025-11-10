import express from "express";
import axios from "axios";
import supabase from "../utils/db.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const CLIENT_ID = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
const REDIRECT_URI = process.env.PATREON_REDIRECT_URI_PROD;

// 🔹 1️⃣ Redirect ke Patreon
router.get("/auth", (req, res) => {
  const { user_id } = req.query;

  const url = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=identity%20identity[email]%20campaigns.members`;

  // Simpan user_id sebagai state agar callback bisa tahu milik siapa
  const state = encodeURIComponent(user_id || "guest");
  res.redirect(`${url}&state=${state}`);
});

// 🔹 2️⃣ Callback dari Patreon
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const user_id = state === "guest" ? null : state;

  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    // Tukar code jadi token
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

    // Ambil data user Patreon
    const userRes = await axios.get(
      "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Buser%5D=full_name,email,image_url",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const patreonUser = userRes.data?.data;
    const patreonId = patreonUser?.id;
    const email = patreonUser?.attributes?.email || null;
    const fullName = patreonUser?.attributes?.full_name || null;
    const avatarUrl = patreonUser?.attributes?.image_url || null;

    const membership = userRes.data?.included?.[0];
    const tierName = membership?.attributes?.patron_status || null;
    const tierAmount = membership?.attributes?.currently_entitled_amount_cents
      ? membership.attributes.currently_entitled_amount_cents / 100
      : null;
    const membershipStatus = membership?.attributes?.patron_status || null;

    // Simpan ke Supabase
    const { data, error } = await supabase
      .from("user_patreon")
      .upsert(
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
        { onConflict: "patreon_id" }
      )
      .select();

    if (error) throw error;

    console.log("✅ Patreon linked:", data[0]);

    res.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_ORIGIN_1
      }/patreon-success?linked=true&email=${encodeURIComponent(email)}`
    );
  } catch (err) {
    console.error("❌ Patreon callback error (details):");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else if (err.message) {
      console.error("Message:", err.message);
    } else {
      console.error(err);
    }

    res.status(500).json({ error: "Patreon authentication failed" });
  }
});

export default router;
