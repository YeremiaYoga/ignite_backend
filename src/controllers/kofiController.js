// src/controllers/kofiController.js
import { insertKofiLog, getAllKofiLogs } from "../models/kofiModel.js";

/**
 * Endpoint untuk menerima webhook dari Ko-fi
 */
export const handleKofiWebhook = async (req, res) => {
  try {
    const payload = req.body;
    console.log("📩 Webhook received:", payload);

    // verifikasi token
    if (payload.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
      console.warn("⚠️ Invalid Ko-fi verification token");
      await insertKofiLog(payload, false);
      return res.status(401).json({ error: "Invalid verification token" });
    }

    // simpan log verified
    await insertKofiLog(payload, true);
    return res.json({ success: true });
  } catch (error) {
    console.error("❌ handleKofiWebhook error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Endpoint untuk ngecek semua log dari Ko-fi
 */
export const listKofiLogs = async (req, res) => {
  try {
    const data = await getAllKofiLogs();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const sendDummyKofi = async (req, res) => {
  try {
    // optional secret check
    const secretEnv = process.env.KOFI_DUMMY_SECRET || null;
    if (secretEnv) {
      const provided = req.headers["x-dummy-secret"];
      if (!provided || provided !== secretEnv) {
        return res.status(403).json({ success: false, error: "Invalid dummy secret" });
      }
    }

    // build dummy payload — kamu bisa override via body
    const now = new Date();
    const payload = {
      verification_token: process.env.KOFI_VERIFICATION_TOKEN || "DUMMY_TOKEN",
      type: req.body.type || "Subscription",
      from_name: req.body.from_name || "DummyUser",
      supporter_user_id: req.body.supporter_user_id || `DUMMY_${Math.floor(Math.random()*100000)}`,
      tier_name: req.body.tier_name || "Gold",
      amount: req.body.amount || 5,
      currency: req.body.currency || "USD",
      message: req.body.message || "This is a dummy Ko-fi webhook for testing",
      is_subscription_payment: req.body.is_subscription_payment === undefined ? true : !!req.body.is_subscription_payment,
      is_first_subscription_payment: req.body.is_first_subscription_payment === undefined ? true : !!req.body.is_first_subscription_payment,
      created_at: now.toISOString(),
    };

    // insert log (mark verified true because dummy uses the verification token)
    const verified = payload.verification_token === process.env.KOFI_VERIFICATION_TOKEN;
    await insertKofiLog(payload, verified);

    return res.json({ success: true, payload, verified });
  } catch (err) {
    console.error("sendDummyKofi error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getKofiMembership = async (req, res) => {
  try {
    const username = req.params.username; // misal "yourkofiusername"
    const response = await fetch(
      `https://ko-fi.com/api/v1.1/memberships?username=${username}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.KOFI_API_KEY}`,
        },
      }
    );

    if (!response.ok) throw new Error(`Ko-fi API error: ${response.status}`);
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error("getKofiMembership error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};