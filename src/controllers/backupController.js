import fs from "fs";
import path from "path";
import cron from "node-cron";
import supabase from "../utils/db.js";
import { backupConfig } from "../config/backupConfig.js";

const TZ = "Asia/Jakarta";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Ambil timestamp Jakarta yang stabil: YYYY-MM-DD dan HH-mm
function getJakartaStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value || "";

  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const hh = get("hour");
  const mi = get("minute");

  return {
    dateDir: `${yyyy}-${mm}-${dd}`,
    timeDir: `${pad2(hh)}-${pad2(mi)}`, // contoh: 16-00
  };
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export const backupSingleTable = async (table, dateDir, timeDir) => {
  try {
    console.log(`📦 Backing up table: ${table}`);

    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn(`⚠️ No data in table: ${table}`);
      return null;
    }

    const baseDir = path.join(process.cwd(), "backups");
    const dateFolder = path.join(baseDir, dateDir);
    const timeFolder = path.join(dateFolder, timeDir);

    ensureDir(timeFolder);

    const fileName = `${table}_table.json`;
    const filePath = path.join(timeFolder, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Backup completed: ${filePath}`);

    return filePath;
  } catch (err) {
    console.error(`❌ Backup failed for ${table}:`, err?.message || err);
    return null;
  }
};

export const manualBackup = async (req, res) => {
  try {
    const { table } = req.params;
    if (!table) return res.status(400).json({ error: "Missing table name" });

    const { dateDir, timeDir } = getJakartaStamp(new Date());
    const file = await backupSingleTable(table, dateDir, timeDir);

    if (!file)
      return res.status(500).json({ error: "Backup failed or table empty" });

    res.json({
      success: true,
      message: `Backup for '${table}' saved at ${file}`,
      file,
      dateDir,
      timeDir,
    });
  } catch (err) {
    console.error("❌ Manual backup error:", err?.message || err);
    res.status(500).json({ error: "Internal backup error" });
  }
};

export const scheduleAutoBackup = () => {
  console.log("🟢 scheduleAutoBackup() loaded...");
  console.log("🕒 Server local time:", new Date().toString());
  console.log(
    "🕓 Server time (Asia/Jakarta):",
    new Date().toLocaleString("id-ID", { timeZone: TZ })
  );

  if (!backupConfig.enabled) {
    console.log("⚠️ Auto backup disabled in config.");
    return;
  }

  const schedule = backupConfig.schedule;
  const tables = backupConfig.tables;
  const readableTime = backupConfig.readable_time || "(custom cron)";

  console.log(`
🧩 Backup Configuration
─────────────────────────────
🕓 Schedule : ${readableTime} WIB (${schedule})
🌏 Timezone : ${TZ}
📦 Tables   : ${tables.join(", ")}
📂 Output   : backups/YYYY-MM-DD/HH-mm/<table>_table.json
─────────────────────────────
`);

  cron.schedule(
    schedule,
    async () => {
      const stamp = getJakartaStamp(new Date());
      console.log(`🚀 Auto backup started for ${stamp.dateDir} ${stamp.timeDir}`);

      for (const table of tables) {
        await backupSingleTable(table, stamp.dateDir, stamp.timeDir);
      }

      console.log(`✅ Auto backup finished for ${stamp.dateDir} ${stamp.timeDir}`);
    },
    { timezone: TZ }
  );
};
