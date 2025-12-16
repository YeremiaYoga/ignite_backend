import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";
import dotenv from "dotenv";
import { upsertUserFromPatreon } from "../models/userModel.js";
import { generateUniqueFriendCode } from "../utils/friendCode.js"; // 🔹 NEW

dotenv.config();
const router = express.Router();

const CLIENT_ID = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
const REDIRECT_URI = process.env.PATREON_REDIRECT_URI;
const isProd = process.env.NODE_ENV === "production"; // 🔹 biar isProd tidak undefined

const PATREON_SCOPE = [
  "identity",
  "identity[email]",
  "identity.memberships",
  "campaigns",
  "campaigns.members",
  "campaigns.members[email]",
  "campaigns.members.address",
].join(" ");

/* 🔹 Helper: pastikan user punya friend_code unik */
async function ensureFriendCode(userId) {
  const { data: existing, error: existingErr } = await supabase
    .from("users")
    .select("friend_code")
    .eq("id", userId)
    .single();

  if (existingErr) {
    console.error("❌ Failed to fetch friend_code:", existingErr.message);
    throw existingErr;
  }

  // sudah punya → langsung pakai
  if (existing?.friend_code) return existing.friend_code;

  // belum punya → generate unik dan update
  const newCode = await generateUniqueFriendCode();

  const { data: updated, error: updateErr } = await supabase
    .from("users")
    .update({ friend_code: newCode })
    .eq("id", userId)
    .select("friend_code")
    .single();

  if (updateErr) {
    console.error("❌ Failed to set friend_code:", updateErr.message);
    throw updateErr;
  }

  console.log(`✅ Friend code generated for user ${userId}: ${updated.friend_code}`);
  return updated.friend_code;
}

router.get("/auth", (req, res) => {
  const { user_id } = req.query;

  const url = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(PATREON_SCOPE)}`;

  const state = encodeURIComponent(user_id || "guest");
  res.redirect(`${url}&state=${state}`);
});

// 🔹 2️⃣ Callback dari Patreon
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  // user_id dari state (kalau frontend kirim ?user_id=...)
  const userIdFromState = state === "guest" ? null : state;

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

    const userRes = await axios.get(
      "https://www.patreon.com/api/oauth2/v2/identity",
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params: {
          include: [
            "memberships",
            "memberships.campaign",
            "memberships.currently_entitled_tiers",
          ].join(","),
          "fields[user]": [
            "full_name",
            "first_name",
            "last_name",
            "email",
            "image_url",
            "thumb_url",
            "url",
            "about",
            "social_connections",
            "vanity",
            "created",
          ].join(","),
          "fields[member]": [
            "full_name",
            "patron_status",
            "is_follower",
            "currently_entitled_amount_cents",
            "lifetime_support_cents",
            "last_charge_date",
            "last_charge_status",
            "pledge_relationship_start",
            "campaign_lifetime_support_cents",
          ].join(","),
          "fields[tier]": [
            "title",
            "description",
            "amount_cents",
            "requires_shipping",
            "created_at",
            "published",
            "unpublished_at",
          ].join(","),
        },
      }
    );

    // ==============================
    // 3️⃣ Ambil data dasar user
    // ==============================
    const patreonUser = userRes.data?.data;
    const patreonId = patreonUser?.id;
    const email = patreonUser?.attributes?.email || null;
    const fullName = patreonUser?.attributes?.full_name || "Patreon User";
    const avatarUrl = patreonUser?.attributes?.image_url || null;

    const included = Array.isArray(userRes.data?.included)
      ? userRes.data.included
      : [];

    const membership =
      included.find((i) => i.type === "member") || included[0] || null;

    const tierName = membership?.attributes?.patron_status || "free";
    const tierAmount = membership?.attributes?.currently_entitled_amount_cents
      ? membership.attributes.currently_entitled_amount_cents / 100
      : 0;
    const membershipStatus = membership?.attributes?.patron_status || "free";

    if (!patreonId) {
      console.error(
        "❌ Tidak ada patreonId di response Patreon:",
        userRes.data
      );
      return res.status(500).json({ error: "Invalid Patreon response" });
    }

    // 4️⃣ Upsert user utama (tabel users) dari Patreon
    const finalUser = await upsertUserFromPatreon({
      patreonId,
      email,
      fullName,
      avatarUrl,
      tierName,
    });


    const friendCode = await ensureFriendCode(finalUser.id);


    const linkedUserId = userIdFromState || finalUser?.id || null;

    const { data: existingPatreon } = await supabase
      .from("user_patreon")
      .select("id, user_id")
      .eq("patreon_id", patreonId)
      .maybeSingle();

    const basePatch = {
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
    };

    if (existingPatreon) {
      const patch = {
        ...basePatch,
        ...(linkedUserId ? { user_id: linkedUserId } : {}),
      };

      await supabase
        .from("user_patreon")
        .update(patch)
        .eq("patreon_id", patreonId);
    } else {
      await supabase.from("user_patreon").insert([
        {
          user_id: linkedUserId,
          patreon_id: patreonId,
          ...basePatch,
        },
      ]);
    }

    // 6️⃣ LOGGING PENUH ke tabel patreon_data (FULL SNAPSHOT)
    try {
      const now = new Date().toISOString();

      const { data: existingLog, error: logFetchError } = await supabase
        .from("patreon_data")
        .select("id")
        .eq("patreon_id", patreonId)
        .maybeSingle();

      if (logFetchError && logFetchError.code !== "PGRST116") {
        console.error(
          "⚠️ Gagal cek existing patreon_data:",
          logFetchError.message
        );
      }

      const payload = {
        user_id: linkedUserId,
        patreon_id: patreonId,
        raw_user: userRes.data,
        raw_token: tokenRes.data,
        updated_at: now,
      };

      if (existingLog) {
        await supabase
          .from("patreon_data")
          .update(payload)
          .eq("id", existingLog.id);
      } else {
        await supabase.from("patreon_data").insert([
          {
            ...payload,
            created_at: now,
          },
        ]);
      }
    } catch (logErr) {
      console.error("⚠️ Gagal upsert ke patreon_data:", logErr.message);
    }

    // 🔐 Buat JWT (sekarang include friend_code juga kalau mau)
    const accessTokenJWT = jwt.sign(
      {
        id: finalUser.id,
        email: finalUser.email,
        username: finalUser.name,
        role: finalUser.role,
        app: "ignite",
        friend_code: friendCode, // 🔹 tambahkan di JWT payload
      },
      process.env.JWT_SECRET_USER,
      { expiresIn: "9h" }
    );

    const userAgent = req.get("User-Agent") || "";
    const isFirefox = /firefox/i.test(userAgent);

 
    if (isFirefox) {
    
      res.cookie("ignite_access_token", accessTokenJWT, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 9 * 60 * 60 * 1000,
      });
    } else {
      console.log("🌐 Setting cookie untuk non-Firefox");

      res.cookie("ignite_access_token", accessTokenJWT, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 9 * 60 * 60 * 1000,
      });
    }

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
