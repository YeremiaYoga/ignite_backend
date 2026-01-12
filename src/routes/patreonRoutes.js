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
const isProd = process.env.NODE_ENV === "production";

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

  if (existing?.friend_code) return existing.friend_code;

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


  return updated.friend_code;
}

/* 🔹 Helper: sync limit user berdasarkan tier di table `tiers` */
async function syncUserLimitsFromTier(userId) {
  try {
    // Ambil info tier user saat ini
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("tier_id, tier")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      console.error("⚠️ Gagal ambil user untuk sync limits:", userErr?.message);
      return;
    }

    let tierRow = null;

    // 1️⃣ Prioritas: pakai tier_id jika ada
    if (user.tier_id) {
      const { data, error } = await supabase
        .from("tiers")
        .select("*")
        .eq("id", user.tier_id)
        .maybeSingle();
      if (!error && data) tierRow = data;
    }

    // 2️⃣ Fallback: pakai field `tier` (slug / name)
    if (!tierRow && user.tier) {
      const slugOrName = user.tier;
      const { data, error } = await supabase
        .from("tiers")
        .select("*")
        .or(`slug.eq.${slugOrName},name.ilike.${slugOrName}`)
        .maybeSingle();
      if (!error && data) tierRow = data;
    }

    // 3️⃣ Fallback terakhir: coba tier "free"
    if (!tierRow) {
      const { data } = await supabase
        .from("tiers")
        .select("*")
        .eq("slug", "free")
        .maybeSingle();
      if (data) tierRow = data;
    }

    if (!tierRow) {
      console.warn("⚠️ Tidak menemukan tier untuk user, skip sync limits");
      return;
    }

    const isUnlimited = !!tierRow.is_unlimited;

    // 🔹 fallback aman kalau tiers.journal_limit null: pakai default 100000
    const journalFallback = 100000;

    const payload = {
      // pastikan tier text & tier_id konsisten
      tier_id: tierRow.id,
      tier: tierRow.slug || tierRow.name || user.tier,

      character_limit: isUnlimited ? null : tierRow.character_limit,
      world_limit: isUnlimited ? null : tierRow.world_limit,
      storage_limit: isUnlimited ? null : tierRow.storage_limit,
      campaign_limit: isUnlimited ? null : tierRow.campaign_limit,
      fvtt_limit: isUnlimited ? null : tierRow.fvtt_limit,
      group_limit: isUnlimited ? null : tierRow.group_limit,
      era_limit: isUnlimited ? null : tierRow.era_limit,
      friend_limit: isUnlimited ? null : tierRow.friend_limit,

      // ✅ NEW: journal_limit
      journal_limit: isUnlimited
        ? null
        : tierRow.journal_limit ?? journalFallback,
    };

    const { error: updateErr } = await supabase
      .from("users")
      .update(payload)
      .eq("id", userId);

    if (updateErr) {
      console.error(
        "❌ Gagal update user limits dari tier:",
        updateErr.message
      );
    } else {
      console.log(`✅ User ${userId} limits synced from tier ${payload.tier}`);
    }
  } catch (e) {
    console.error("❌ syncUserLimitsFromTier error:", e.message);
  }
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

    // 3️⃣ Ambil data dasar user
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

    await syncUserLimitsFromTier(finalUser.id);

    const linkedUserId = userIdFromState || finalUser?.id || null;

    const { data: existingPatreon } = await supabase
      .from("user_patreon")
      .select("id, user_id")
      .eq("patreon_id", patreonId)
      .maybeSingle();

    const nowIso = new Date().toISOString();

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

      patreon_data: {
        fetched_at: nowIso,
        raw_user: userRes.data,
        raw_token: tokenRes.data,
      },

      updated_at: nowIso,
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

    try {
      const now = new Date().toISOString();

      const snapshot = {
        fetched_at: now,
        raw_user: userRes.data,
        raw_token: tokenRes.data,
      };

      await supabase
        .from("user_patreon")
        .update({
          patreon_data: snapshot,
          updated_at: now,
        })
        .eq("patreon_id", patreonId);
    } catch (logErr) {
      console.error("⚠️ Gagal update snapshot patreon_data:", logErr.message);
    }

    // 9️⃣ Buat JWT
    const accessTokenJWT = jwt.sign(
      {
        id: finalUser.id,
        email: finalUser.email,
        username: finalUser.name,
        role: finalUser.role,
        app: "ignite",
        friend_code: friendCode,
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

    const redirectBase = String(
      process.env.REDIRECT_PATREON_DOMAIN || ""
    ).replace(/\/$/, "");
    const emailSafe = encodeURIComponent(finalUser.email || "");

    res.redirect(
      `${redirectBase}/patreon-success?linked=true&email=${emailSafe}#token=${accessTokenJWT}`
    );
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
