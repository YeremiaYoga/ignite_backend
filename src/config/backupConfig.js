import dotenv from "dotenv";
dotenv.config();

/**
 * 🕒 Konversi BACKUP_TIME (HH:mm) → cron format (m H * * *)
 */
function convertTimeToCron(timeString) {
  try {
    const [hour, minute] = timeString.split(":").map(Number);

    if (
      isNaN(hour) ||
      isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new Error("Invalid BACKUP_TIME format. Use HH:mm (e.g. 18:30)");
    }

    return `${minute} ${hour} * * *`;
  } catch (err) {
    console.warn("⚠️ Invalid BACKUP_TIME in .env, fallback to 02:00");
    return "0 2 * * *"; // fallback default 02:00 WIB
  }
}

// 🧩 Ambil dari env
const BACKUP_TIME = process.env.BACKUP_TIME || "02:00";

export const backupConfig = {
  enabled: true,

  tables: [
    "backgrounds",
    "characters",
    "dnd_source",
    "feats",
    "incumbency",
    "kofi_logs",
    "languages",
    "races",
    "species",
    "species_group_type",
    "species_traits",
    "subraces",
    "tiers",
    "trait_modifiers",
    "user_patreon",
    "users",
    "wayfarers",
  ],

  schedule: convertTimeToCron(BACKUP_TIME),
  readable_time: BACKUP_TIME,
};
