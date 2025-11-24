// controllers/foundryEquipmentController.js
import {
  bulkInsertFoundryEquipments,
  listFoundryEquipments,
  getFoundryEquipmentById,
  deleteFoundryEquipment,
  updateFoundryEquipment,
  exportFoundryEquipment,
} from "../models/foundryEquipmentModel.js";

const MEDIA_BASE =
  process.env.PUBLIC_MEDIA_URL ||
  process.env.NEXT_PUBLIC_MEDIA_URL ||
  process.env.MEDIA_URL ||
  "";

/** Helpers */

function normalizeFoundryEquipment(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid equipment JSON");
  }

  const name = raw.name || "Unknown Equipment";
  const type = raw.type || "equipment";
  const img = raw.img || null;

  const system = raw.system ?? {};
  const effects = Array.isArray(raw.effects) ? raw.effects : [];

  return {
    name,
    type,
    img,
    system,
    effects,
  };
}

function resolveItemImage(raw, normalized) {
  const system = normalized.system || {};
  let src = system.img || normalized.img || raw.img || null;

  if (!src) return null;
  src = String(src).trim();
  if (!src) return null;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  let path = src.replace(/^\/+/, "");

  const systemsPrefix = "systems/dnd5e/icons/";
  if (path.startsWith(systemsPrefix)) {
    path = path.slice(systemsPrefix.length);
  }

  const iconsPrefix = "icons/";
  if (path.startsWith(iconsPrefix)) {
    path = path.slice(iconsPrefix.length);
  }

  const base = MEDIA_BASE.replace(/\/+$/, "");
  if (!base) {
    return `/foundryvtt/${path}`;
  }

  return `${base}/foundryvtt/${path}`;
}

function getCompendiumSource(rawItem) {
  return rawItem?._stats?.compendiumSource ?? null;
}

function getSourceBook(system) {
  return system?.source?.book ?? null;
}

function getPriceInCp(system) {
  const price = system?.price;
  if (!price) return null;

  const value = Number(price.value ?? 0);
  if (!Number.isFinite(value)) return null;

  const denom = (price.denomination || "cp").toLowerCase();

  let multiplier;
  switch (denom) {
    case "cp":
      multiplier = 1;
      break;
    case "sp":
      multiplier = 10;
      break;
    case "ep":
      multiplier = 50;
      break;
    case "gp":
      multiplier = 100;
      break;
    case "pp":
      multiplier = 1000;
      break;
    default:
      multiplier = 1;
  }

  return value * multiplier;
}

/**
 * POST /foundry/equipments/import
 */
export const importFoundryEquipments = async (req, res) => {
  try {
    const body = req.body;

    let items = [];
    if (Array.isArray(body)) items = body;
    else if (body && typeof body === "object") items = [body];
    else {
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
        const normalized = normalizeFoundryEquipment(raw);
        const { name, type, system } = normalized;

        if (type !== "equipment") {
          errors.push({
            name,
            error: `Invalid type "${type}", only "equipment" is allowed`,
          });
          continue;
        }

        const sysType = system?.type || {};
        const weight = system?.weight?.value ?? null;
        const image = resolveItemImage(raw, normalized);

        const compendium_source = getCompendiumSource(raw);
        const price = getPriceInCp(system);
        const source_book = getSourceBook(system);

        payloads.push({
          name,
          type,

          raw_data: raw,
          format_data: normalized,

          type_value: sysType.value ?? null,
          base_item: sysType.baseItem ?? null,
          weight,
          properties: system?.properties ?? null,
          rarity: system?.rarity ?? null,

          compendium_source,
          price,
          source_book,

          attunement: system?.attunement ?? null,
          image,
        });
      } catch (err) {
        console.error("💥 Normalisasi equipment gagal:", err);
        errors.push({
          name: raw?.name || null,
          error: err.message,
        });
      }
    }

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryEquipments(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryEquipments error:", err);
    return res
      .status(500)
      .json({ error: "Failed to import foundry equipments" });
  }
};

/**
 * GET /foundry/equipments
 */
export const listFoundryEquipmentsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryEquipments({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryEquipmentsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry equipments" });
  }
};

/**
 * GET /foundry/equipments/:id
 */
export const getFoundryEquipmentHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryEquipmentById(id);
    if (!row) {
      return res.status(404).json({ error: "Equipment not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryEquipmentHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry equipment" });
  }
};

/**
 * PUT /foundry/equipments/:id
 */
export const updateFoundryEquipmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const updated = await updateFoundryEquipment(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryEquipmentHandler error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update foundry equipment" });
  }
};

/**
 * DELETE /foundry/equipments/:id
 */
export const deleteFoundryEquipmentHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryEquipment(id);

    return res.json({
      success: true,
      message: "Equipment deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryEquipmentHandler error:", err);
    return res
      .status(500)
      .json({ error: "Failed to delete foundry equipment" });
  }
};

/**
 * GET /foundry/equipments/:id/export?mode=raw|format
 */
export async function exportFoundryEquipmentHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await exportFoundryEquipment(id);
    if (!row) {
      return res.status(404).json({ error: "Equipment not found" });
    }

    let exported;
    if (mode === "format") exported = row.format_data || row;
    else exported = row.raw_data || row;

    const safeMode = mode === "format" ? "format" : "raw";
    const filename = `${row.name.replace(/\s+/g, "_")}_${safeMode}.json`;

    // const safeName = row.name?.replace(/\s+/g, "_") || "item";
    // const safeType = row.type?.toLowerCase() || "unknown";

    // const filename = `${safeName}_${safeType}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ exportFoundryEquipmentHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
