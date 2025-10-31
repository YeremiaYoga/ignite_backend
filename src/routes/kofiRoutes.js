import express from "express";
import bodyParser from "body-parser";
import {
  handleKofiWebhook,
  listKofiLogs,
  sendDummyKofi, // 👉 tambahkan controller baru
} from "../controllers/kofiController.js";

const router = express.Router();

// 📩 menerima event asli dari Ko-fi (x-www-form-urlencoded + JSON)
router.post(
  "/webhook",
  bodyParser.urlencoded({ extended: true }),
  bodyParser.json(),
  handleKofiWebhook
);

// 🔍 melihat log yang tersimpan
router.get("/logs", listKofiLogs);

// 🧪 kirim dummy payload (manual testing)
router.get("/dummy", async (req, res) => {
  const { insertKofiLog } = await import("../models/kofiModel.js");
  const payload = {
    from_name: "BrowserTester",
    supporter_user_id: "BROWSER_" + Date.now(),
    tier_name: "TestTier",
    amount: 1,
    currency: "USD",
    message: "Sent via GET from browser"
  };
  await insertKofiLog(payload, true);
  res.send("✅ Dummy webhook inserted!");
});


export default router;
