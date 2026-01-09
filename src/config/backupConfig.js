import dotenv from "dotenv";
dotenv.config();

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
    return "0 2 * * *";
  }
}

// 🧩 Ambil dari env
const BACKUP_TIME = process.env.BACKUP_TIME || "02:00";

const backup_schedule = "0 */6 * * *";

export const backupConfig = {
  enabled: true,

  tables: [
    "users",
    "tiers",
    "user_patreon",
    "kofi_logs",

    "backgrounds",
    "characters",
    "dnd_source",
    "incumbency",
    "languages",
    "races",
    "species",
    "species_group_type",
    "species_traits",

    "foundry_weapons",
    "foundry_consumables",
    "foundry_containers",
    "foundry_equipments",
    "foundry_loots",
    "foundry_tools",
    "foundry_spells",
    "foundry_features",
    "foundry_feats",

    "journals",
    "friendships",

    "calendars",
    "calendar_events",

    "homebrew_sources",

    "worlds",
    "game_systems",
    "platforms",

    "token_borders",
    "modifiers",

    "campaign_themes",
    "campaign_genres",

    "announcements",
  ],

  schedule: backup_schedule,
  readable_time: "every 6 hours",
};
