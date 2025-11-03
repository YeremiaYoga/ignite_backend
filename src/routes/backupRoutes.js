import express from "express";
import {
  manualBackup,
  backupSingleTable,
} from "../controllers/backupController.js";
import { backupConfig } from "../config/backupConfig.js";

const router = express.Router();

router.get("/test/backup", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const results = {};

    console.log("🧪 Manual test backup triggered...");

    for (const table of backupConfig.tables) {
      const file = await backupSingleTable(table, today);
      results[table] = file ? "✅ success" : "❌ failed";
    }

    res.json({
      success: true,
      message: `🧪 Manual test backup completed (${today})`,
      results,
    });
  } catch (err) {
    console.error("❌ Test backup error:", err.message);
    res.status(500).json({ error: "Manual test backup failed" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const results = {};

    for (const table of backupConfig.tables) {
      const file = await backupSingleTable(table, today);
      results[table] = file ? "✅ success" : "❌ failed";
    }

    res.json({
      success: true,
      message: `Backup completed for all tables (${today})`,
      results,
    });
  } catch (err) {
    console.error("❌ Full backup error:", err.message);
    res.status(500).json({ error: "Failed to backup all tables" });
  }
});

router.get("/:table", manualBackup);

export default router;
