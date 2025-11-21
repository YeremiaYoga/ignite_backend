// controllers/foundryWeaponController.js
import {
  bulkInsertFoundryWeapons,
  listFoundryWeapons,
  getFoundryWeaponById,
  deleteFoundryWeapon,
  updateFoundryWeapon,
} from "../models/foundryWeaponModel.js";

/**
 * Normalisasi raw JSON dari Foundry:
 *  - pastikan name, type, img, system, effects ada
 *  - TIDAK lagi trim system.source (dikembalikan seperti semula)
 */
function normalizeFoundryWeapon(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid weapon JSON");
  }

  const name = raw.name || "Unknown Weapon";
  const type = raw.type || "weapon";
  const img = raw.img || null;

  const systemRaw = raw.system ?? {};
  const effects = Array.isArray(raw.effects) ? raw.effects : [];

  // sekarang system dipakai apa adanya, termasuk source
  const system = systemRaw;

  return {
    name,
    type,
    img,
    system,
    effects,
  };
}

/**
 * POST /foundry/weapons/import
 *
 * Body bisa:
 *  - 1 object JSON
 *  - atau array of JSON
 */
export const importFoundryWeapons = async (req, res) => {
  try {
    const body = req.body;

    let items = [];
    if (Array.isArray(body)) {
      items = body;
    } else if (body && typeof body === "object") {
      items = [body];
    } else {
      return res.status(400).json({
        error: "Request body harus berupa 1 JSON object atau array of JSON",
      });
    }

    if (!items.length) {
      return res.status(400).json({ error: "Tidak ada item untuk diimport" });
    }

    const payloads = [];
    const errors = [];

    for (const raw of items) {
      try {
        // 🔥 Normalisasi Foundry weapon
        const normalized = normalizeFoundryWeapon(raw);
        const { name, type, system } = normalized;

        const sysType = system?.type || {};
        const dmgBase = system?.damage?.base || {};

        payloads.push({
          name,
          type,

          // 📌 tambahkan raw + format (WAJIB!)
          raw_data: raw,
          format_data: normalized,

          // kolom tambahan untuk foundry_weapons
          rarity: system?.rarity ?? null,
          base_item: sysType.baseItem ?? null,
          weapon_type: sysType.value ?? null,
          damage_type: dmgBase.types ?? null,
          attunement: system?.attunement ?? null,
          properties: system?.properties ?? null,
          weight: system?.weight?.value ?? null,
          mastery: system?.mastery ?? null,
        });
      } catch (err) {
        console.error("💥 Normalisasi weapon gagal:", err);
        errors.push({
          name: raw?.name || null,
          error: err.message,
        });
      }
    }

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryWeapons(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryWeapons error:", err);
    return res.status(500).json({ error: "Failed to import foundry weapons" });
  }
};


/**
 * GET /foundry/weapons
 * ?limit=50&offset=0
 */
export const listFoundryWeaponsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryWeapons({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryWeaponsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry weapons" });
  }
};

/**
 * GET /foundry/weapons/:id
 */
export const getFoundryWeaponHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryWeaponById(id);
    if (!row) {
      return res.status(404).json({ error: "Weapon not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryWeaponHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry weapon" });
  }
};

/**
 * PUT /foundry/weapons/:id/format
 * (sekarang pakai updateFoundryWeapon biasa, bukan format_data lagi)
 */
export const updateFoundryWeaponFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res
        .status(400)
        .json({ error: "Payload harus berupa JSON object" });
    }

    const updated = await updateFoundryWeapon(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryWeaponFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update weapon" });
  }
};

/**
 * DELETE /foundry/weapons/:id
 */
export const deleteFoundryWeaponHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryWeapon(id);

    return res.json({
      success: true,
      message: "Weapon deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryWeaponHandler error:", err);
    return res.status(500).json({ error: "Failed to delete foundry weapon" });
  }
};

/**
 * GET /foundry/weapons/:id/export?mode=raw|format
 * Sekarang export langsung row dari DB (karena model lo udah nggak punya raw_data/format_data)
 */
export async function exportFoundryWeaponHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query; // mode masih diterima, tapi sekarang nggak dibedain

    const row = await getFoundryWeaponById(id);
    if (!row) {
      return res.status(404).json({ error: "Weapon not found" });
    }

    const exported = row;
    const filename = `${row.name.replace(/\s+/g, "_")}_${mode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ export handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
