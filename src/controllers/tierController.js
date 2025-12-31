import {
  getAllTiers,
  getTierById,
  createTier,
  updateTier,
  deleteTier,
} from "../models/tierModel.js";

/** Helper: konversi limit ke integer atau null */
const parseLimit = (val, defaultVal = null) => {
  if (val === "" || val === undefined || val === null) return defaultVal;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? defaultVal : n;
};

export const getTiers = async (req, res) => {
  try {
    const { data, error } = await getAllTiers();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getTiers error:", err.message);
    res.status(500).json({ error: "Failed to fetch tiers" });
  }
};

export const getTier = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getTierById(id);
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Tier not found" });

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getTier error:", err.message);
    res.status(500).json({ error: "Failed to fetch tier" });
  }
};

/**
 * ➕ Create new tier
 */
export const createTierController = async (req, res) => {
  try {
    let {
      name,
      slug,
      character_limit,
      description,
      is_active,
      is_unlimited,

      // 🔹 LIMITS
      world_limit,
      storage_limit,
      campaign_limit,
      fvtt_limit,
      group_limit,
      era_limit,
      friend_limit,
      journal_limit, // ✅ NEW
    } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });
    name = name.trim();
    if (name.length === 0)
      return res
        .status(400)
        .json({ error: "Name cannot be empty or spaces only" });

    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // 🔄 Normalisasi boolean
    if (is_unlimited === true || is_unlimited === "true") {
      is_unlimited = true;
    } else {
      is_unlimited = false;
    }

    is_active = is_active === false || is_active === "false" ? false : true;

    // 🔧 Character limit
    if (is_unlimited) {
      character_limit = null;
    } else if (character_limit === "" || character_limit === undefined) {
      character_limit = null;
    } else {
      character_limit = parseInt(character_limit, 10);
    }

    // 🔧 Limit lain
    if (is_unlimited) {
      // ✅ RULE: kalau unlimited, SEMUA limit null
      world_limit = null;
      storage_limit = null;
      campaign_limit = null;
      fvtt_limit = null;
      group_limit = null;
      era_limit = null;
      friend_limit = null;
      journal_limit = null; // ✅ NEW
    } else {
      world_limit = parseLimit(world_limit, 0);
      storage_limit = parseLimit(storage_limit, 0);
      campaign_limit = parseLimit(campaign_limit, 0);
      fvtt_limit = parseLimit(fvtt_limit, 0);
      group_limit = parseLimit(group_limit, 0);
      era_limit = parseLimit(era_limit, 0);
      friend_limit = parseLimit(friend_limit, 0);
      journal_limit = parseLimit(journal_limit, 0); // ✅ NEW
    }

    const newTier = {
      name,
      slug,
      description: description?.trim() || "",
      character_limit,
      is_active,
      is_unlimited,

      world_limit,
      storage_limit,
      campaign_limit,
      fvtt_limit,
      group_limit,
      era_limit,
      friend_limit,
      journal_limit, // ✅ NEW
    };

    const { data, error } = await createTier(newTier);
    if (error) throw error;

    res.json({ success: true, message: "Tier created", data });
  } catch (err) {
    console.error("❌ createTier error:", err.message);
    res.status(500).json({ error: "Failed to create tier" });
  }
};

export const updateTierController = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.name) {
      updates.name = updates.name.trim();
      if (updates.name.length === 0)
        return res
          .status(400)
          .json({ error: "Name cannot be empty or spaces only" });
      updates.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    // 🔄 Normalisasi boolean
    if (typeof updates.is_active === "string")
      updates.is_active = updates.is_active === "true";
    if (typeof updates.is_unlimited === "string")
      updates.is_unlimited = updates.is_unlimited === "true";

    const isUnlimited = updates.is_unlimited === true;

    // 🔧 Character limit
    if (isUnlimited) {
      updates.character_limit = null;
    } else if (
      Object.prototype.hasOwnProperty.call(updates, "character_limit")
    ) {
      if (
        updates.character_limit === "" ||
        updates.character_limit === undefined
      ) {
        updates.character_limit = null;
      } else {
        updates.character_limit = parseInt(updates.character_limit, 10);
      }
    }

    // 🔧 Limit lain
    const limitFields = [
      "world_limit",
      "storage_limit",
      "campaign_limit",
      "fvtt_limit",
      "group_limit",
      "era_limit",
      "friend_limit",
      "journal_limit", // ✅ NEW
    ];

    if (isUnlimited) {
      // ✅ RULE: kalau unlimited, semua limit null
      limitFields.forEach((key) => {
        updates[key] = null;
      });
    } else {
      if (Object.prototype.hasOwnProperty.call(updates, "world_limit")) {
        updates.world_limit = parseLimit(updates.world_limit);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "storage_limit")) {
        updates.storage_limit = parseLimit(updates.storage_limit);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "campaign_limit")) {
        updates.campaign_limit = parseLimit(updates.campaign_limit);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "fvtt_limit")) {
        updates.fvtt_limit = parseLimit(updates.fvtt_limit);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "group_limit")) {
        updates.group_limit = parseLimit(updates.group_limit);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "era_limit")) {
        updates.era_limit = parseLimit(updates.era_limit);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "friend_limit")) {
        updates.friend_limit = parseLimit(updates.friend_limit);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "journal_limit")) {
        updates.journal_limit = parseLimit(updates.journal_limit);
      }
    }

    if (updates.description) {
      updates.description = updates.description.trim();
    }

    const { data, error } = await updateTier(id, updates);
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Tier not found" });

    res.json({ success: true, message: "Tier updated", data });
  } catch (err) {
    console.error("❌ updateTier error:", err.message);
    res.status(500).json({ error: "Failed to update tier" });
  }
};

export const deleteTierController = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await deleteTier(id);
    if (error) throw error;

    res.json({ success: true, message: "Tier deleted" });
  } catch (err) {
    console.error("❌ deleteTier error:", err.message);
    res.status(500).json({ error: "Failed to delete tier" });
  }
};
