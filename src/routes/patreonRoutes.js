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

/**
 * 🔧 Scope lama (minimal)
 * const RAW_SCOPE = "identity identity[email] campaigns.members";
 *
 * 🔧 Scope baru (lebih lengkap):
 *  - identity + email + memberships
 *  - akses campaign + members
 *  - alamat & email member
 */
const PATREON_SCOPE = [
  "identity",
  "identity[email]",
  "identity.memberships",
  "campaigns",
  "campaigns.members",
  "campaigns.members[email]",
  "campaigns.members.address",
].join(" ");

// 🔹 1️⃣ Redirect ke Patreon (OAuth start)
router.get("/auth", (req, res) => {
  const { user_id } = req.query;

  // ❌ VERSI LAMA (disimpan sebagai referensi)
  // const url = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
  //   REDIRECT_URI
  // )}&scope=identity%20identity[email]%20campaigns.members`;

  // ✅ VERSI BARU DENGAN SCOPE LEBIH LENGKAP
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

    /**
     * ❌ VERSI LAMA — contoh minimal (disimpan sebagai referensi)
     *
     * const userRes = await axios.get(
     *   "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Buser%5D=full_name,email,image_url",
     *   { headers: { Authorization: `Bearer ${access_token}` } }
     * );
     */

    /**
     * ✅ VERSI BARU — ambil data LEBIH LENGKAP (user, memberships, tiers, campaign, dll)
     *    TANPA error 400:
     *    - pakai `fields[member]` (BUKAN `fields[membership]`)
     *    - hapus `fields[campaign]` yang bikin error
     */
    const userRes = await axios.get(
      "https://www.patreon.com/api/oauth2/v2/identity",
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params: {
          // 👉 relationships / include yang kaya:
          include: [
            "memberships",
            "memberships.campaign",
            "memberships.currently_entitled_tiers",
          ].join(","),

          // 👉 semua field user yang berguna
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

          // ⚠️ PENTING: harus `member`, bukan `membership`
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

          // 👉 detail tier (kalau ada entitled tiers)
          "fields[tier]": [
            "title",
            "description",
            "amount_cents",
            "requires_shipping",
            "created_at",
            "published",
            "unpublished_at",
          ].join(","),
          // ❌ sengaja TIDAK pakai "fields[campaign]" karena sebelumnya
          //    menyebabkan 400 "Invalid value for parameter 'fields[campaign]'"
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

    // 🔍 included sekarang bisa berisi:
    //  - type: "member"  → membership
    //  - type: "tier"    → tiers
    //  - type: "campaign"→ campaign
    const included = Array.isArray(userRes.data?.included)
      ? userRes.data.included
      : [];

    // Cari membership utama (member)
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

    // Kalau frontend kirim user_id (user sudah login), pakai itu.
    // Kalau tidak, fallback ke finalUser.id (user baru dari Patreon).
    const linkedUserId = userIdFromState || finalUser?.id || null;

    // 5️⃣ Upsert ke user_patreon (link akun Patreon ↔ Ignite)
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
      // ⚠️ Masih disimpan juga di user_patreon (snapshot cepat)
      patreon_data: userRes.data,
      updated_at: new Date().toISOString(),
    };

    if (existingPatreon) {
      // kalau sudah ada, update data + user_id (kalau ada linkedUserId)
      const patch = {
        ...basePatch,
        ...(linkedUserId ? { user_id: linkedUserId } : {}),
      };

      await supabase
        .from("user_patreon")
        .update(patch)
        .eq("patreon_id", patreonId);
    } else {
      // kalau belum ada, insert row baru
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

      // cek apakah sudah ada log untuk patreon_id ini
      const { data: existingLog, error: logFetchError } = await supabase
        .from("patreon_data")
        .select("id")
        .eq("patreon_id", patreonId)
        .maybeSingle();

      if (logFetchError && logFetchError.code !== "PGRST116") {
        // PGRST116 = no rows found → itu bukan error fatal
        console.error(
          "⚠️ Gagal cek existing patreon_data:",
          logFetchError.message
        );
      }

      const payload = {
        user_id: linkedUserId, // ignite user id (boleh null)
        patreon_id: patreonId,
        raw_user: userRes.data, // FULL payload Patreon (user + included)
        raw_token: tokenRes.data,
        updated_at: now,
      };

      if (existingLog) {
        // 🔁 Kalau sudah ada → UPDATE saja snapshot-nya
        await supabase
          .from("patreon_data")
          .update(payload)
          .eq("id", existingLog.id);
      } else {
        // 🆕 Kalau belum ada → INSERT baru
        await supabase.from("patreon_data").insert([
          {
            ...payload,
            created_at: now,
          },
        ]);
      }
    } catch (logErr) {
      // ⚠️ Jangan blokir login kalau logging gagal
      console.error("⚠️ Gagal upsert ke patreon_data:", logErr.message);
    }
    // 🔺 END patreon_data logging

    // 7️⃣ Generate token JWT untuk Ignite
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

    const userAgent = req.get("User-Agent") || "";
    const isFirefox = /firefox/i.test(userAgent);

    // --------------
    // 🔥 CONFIG KHUSUS FIREFOX
    // --------------
    // Firefox TIDAK akan menerima cookie Secure=true kalau bukan HTTPS beneran
    console.log(isFirefox);
    if (isFirefox) {
      console.log(isFirefox);
      res.cookie("ignite_access_token", accessTokenJWT, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        domain: ".projectignite.web.id",
        maxAge: 9 * 60 * 60 * 1000,
      });
    } else {
      // --------------
      // 🌐 CONFIG UNTUK CHROME, EDGE, SAFARI, DLL
      // --------------
      console.log("🌐 Setting cookie untuk non-Firefox");

      res.cookie("ignite_access_token", accessTokenJWT, {
        httpOnly: true,
        secure: true, // Chrome santai, localhost juga biasanya oke
        sameSite: "none", // Chrome oke, Firefox yang bermasalah
        maxAge: 9 * 60 * 60 * 1000,
      });
    }

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

// 🔹 Fetch data Patreon link (versi ringkas untuk frontend)
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
