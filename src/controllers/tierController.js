import {
  getAllTiers,
  getTierById,
  createTier,
  updateTier,
  deleteTier,
} from "../models/tierModel.js";

/**
 * 📦 Get all tiers
 */
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

/**
 * 🔍 Get tier by ID
 */
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
    let { name, slug, character_limit, description, is_active, is_unlimited } =
      req.body;

    // 🧩 Validasi wajib name
    if (!name) return res.status(400).json({ error: "Name is required" });

    // ✂️ Hapus spasi depan/belakang dan validasi ulang
    name = name.trim();
    if (name.length === 0)
      return res.status(400).json({ error: "Name cannot be empty or spaces only" });

    // 🪄 Auto generate slug dari name (tanpa slugify)
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // ubah spasi/simbol ke "-"
      .replace(/^-+|-+$/g, ""); // hapus tanda "-" di awal/akhir

    // 🧮 Normalisasi character_limit
    if (is_unlimited === true || is_unlimited === "true") {
      character_limit = null;
      is_unlimited = true;
    } else if (character_limit === "" || character_limit === undefined) {
      character_limit = null;
      is_unlimited = false;
    } else {
      character_limit = parseInt(character_limit, 10);
    }

    // 🔧 Normalisasi boolean
    is_active = is_active === false || is_active === "false" ? false : true;

    const newTier = {
      name,
      slug,
      description: description?.trim() || "",
      character_limit,
      is_active,
      is_unlimited,
    };

    const { data, error } = await createTier(newTier);
    if (error) throw error;

    res.json({ success: true, message: "Tier created", data });
  } catch (err) {
    console.error("❌ createTier error:", err.message);
    res.status(500).json({ error: "Failed to create tier" });
  }
};


/**
 * ✏️ Update tier
 */
export const updateTierController = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // ✂️ Trim name & validasi spasi-only
    if (updates.name) {
      updates.name = updates.name.trim();
      if (updates.name.length === 0)
        return res.status(400).json({ error: "Name cannot be empty or spaces only" });

      // 🪄 Auto slug update jika name berubah
      updates.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    // 🔧 Boolean konversi
    if (typeof updates.is_active === "string")
      updates.is_active = updates.is_active === "true";
    if (typeof updates.is_unlimited === "string")
      updates.is_unlimited = updates.is_unlimited === "true";

    // 🧮 Handle karakter limit otomatis
    if (updates.is_unlimited) {
      updates.character_limit = null;
    } else if (
      updates.character_limit === "" ||
      updates.character_limit === undefined
    ) {
      updates.character_limit = null;
    } else {
      updates.character_limit = parseInt(updates.character_limit, 10);
    }

    // ✏️ Trim description jika ada
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


/**
 * ❌ Delete tier
 */
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
