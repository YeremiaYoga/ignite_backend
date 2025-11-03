import fs from "fs";
import path from "path";
import cron from "node-cron";
import supabase from "../utils/db.js";
import { backupConfig } from "../config/backupConfig.js";

/**
 * Backup satu tabel ke file JSON dalam folder tanggal
 */
export const backupSingleTable = async (table, dateDir) => {
  try {
    console.log(`📦 Backing up table: ${table}`);

    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      console.warn(`⚠️ No data in table: ${table}`);
      return null;
    }

    // Pastikan folder utama backup ada
    const baseDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

    // Buat folder tanggal, contoh: backups/2025-11-03
    const dateFolder = path.join(baseDir, dateDir);
    if (!fs.existsSync(dateFolder)) fs.mkdirSync(dateFolder);

    // Nama file per tabel
    const fileName = `${table}_table.json`;
    const filePath = path.join(dateFolder, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Backup completed: ${filePath}`);

    return filePath;
  } catch (err) {
    console.error(`❌ Backup failed for ${table}:`, err.message);
    return null;
  }
};

/**
 * Jalankan backup manual via route
 */
export const manualBackup = async (req, res) => {
  try {
    const { table } = req.params;
    if (!table) return res.status(400).json({ error: "Missing table name" });

    const today = new Date().toISOString().split("T")[0];
    const file = await backupSingleTable(table, today);

    if (!file)
      return res.status(500).json({ error: "Backup failed or table empty" });

    res.json({
      success: true,
      message: `Backup for '${table}' saved at ${file}`,
      file,
    });
  } catch (err) {
    console.error("❌ Manual backup error:", err.message);
    res.status(500).json({ error: "Internal backup error" });
  }
};

/**
 * Jalankan auto backup sesuai jadwal cron
 */
export const scheduleAutoBackup = () => {
  if (!backupConfig.enabled) return;

  cron.schedule(backupConfig.schedule, async () => {
    const today = new Date().toISOString().split("T")[0];
    console.log(`🕒 Auto backup started for ${today}`);

    for (const table of backupConfig.tables) {
      await backupSingleTable(table, today);
    }

    console.log(`✅ Auto backup finished for ${today}`);
  });

  console.log(`🗓️ Auto-backup scheduled: ${backupConfig.schedule}`);
};
