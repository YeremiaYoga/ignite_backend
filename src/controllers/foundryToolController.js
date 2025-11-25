// controllers/foundryToolController.js
import {
  bulkInsertFoundryTools,
  listFoundryTools,
  getFoundryToolById,
  deleteFoundryTool,
  updateFoundryTool,
} from "../models/foundryToolModel.js";

const MEDIA_BASE =
  process.env.PUBLIC_MEDIA_URL ||
  process.env.NEXT_PUBLIC_MEDIA_URL ||
  process.env.MEDIA_URL ||
  "";

/**
 * Helper: normalisasi raw tool
 */
function normalizeFoundryTool(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid tool JSON");
  }

  const name = raw.name || "Unknown Tool";
  const type = raw.type || "tool";
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

/**
 * Helper: resolve image path ke URL
 */
function resolveToolImage(raw, normalized) {
  const system = normalized.system || {};
  let src = system.img || normalized.img || raw.img || null;

  if (!src) return null;
  src = String(src).trim();
  if (!src) return null;

  // Sudah full URL
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Normalisasi path
  let path = src.replace(/^\/+/, ""); // buang leading "/"

  // systems/dnd5e/icons/... => buang sampai "icons/"
  const systemsPrefix = "systems/dnd5e/icons/";
  if (path.startsWith(systemsPrefix)) {
    path = path.slice(systemsPrefix.length);
  }

  // icons/... => buang "icons/"
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

/**
 * Helper: ambil compendiumSource dari _stats
 */
function getCompendiumSource(rawItem) {
  return rawItem?._stats?.compendiumSource ?? null;
}

/**
 * Helper: ambil source book, contoh "DMG 2024"
 */
function getSourceBook(system) {
  return system?.source?.book ?? null;
}

/**
 * Helper: hitung harga dalam CP
 * cp: x1, sp: x10, ep: x50, gp: x100, pp: x1000
 */
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
 * POST /foundry/tools/import
 */
export const importFoundryTools = async (req, res) => {
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
        const normalized = normalizeFoundryTool(raw);
        const { name, type, system } = normalized;

        // ❌ hanya terima type "tool"
        if (type !== "tool") {
          errors.push({
            name,
            error: `Invalid type "${type}", only "tool" is allowed`,
          });
          continue;
        }

        const sysType = system?.type || {};
        const image = resolveToolImage(raw, normalized);

        // 🆕 kolom tambahan: compendium, price(cp), source book
        const compendium_source = getCompendiumSource(raw);
        const price = getPriceInCp(system); // dalam CP
        const source_book = getSourceBook(system);

        payloads.push({
          name,
          type,

          // JSONB di DB
          raw_data: raw,
          format_data: normalized,

          // mapping sesuai aturan:
          // rarity    = system.rarity
          // base_item = system.type.baseItem
          // tool_type = system.type.value
          // properties = system.properties
          // weight    = system.weight.value
          // attunement= system.attunement
          rarity: system?.rarity ?? null,
          base_item: sysType.baseItem ?? null,
          tool_type: sysType.value ?? null,
          properties: system?.properties ?? null,
          weight: system?.weight?.value ?? null,
          attunement: system?.attunement ?? null,

          // kolom baru
          compendium_source,
          price,
          source_book,

          // kalau mau aktifkan image tinggal ganti ke image ?? null
          image: image ?? null,
        });
      } catch (err) {
        console.error("💥 Normalisasi tool gagal:", err);
        errors.push({
          name: raw?.name || null,
          error: err.message,
        });
      }
    }

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryTools(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryTools error:", err);
    return res.status(500).json({ error: "Failed to import foundry tools" });
  }
};

/**
 * GET /foundry/tools
 * ?limit=50&offset=0
 */
export const listFoundryToolsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryTools({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryToolsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry tools" });
  }
};

/**
 * GET /foundry/tools/:id
 */
export const getFoundryToolHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryToolById(id);
    if (!row) {
      return res.status(404).json({ error: "Tool not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryToolHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry tool" });
  }
};

/**
 * PUT /foundry/tools/:id
 * - update data tool (rarity, base_item, tool_type, dll, termasuk kolom baru)
 */
export const updateFoundryToolHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const updated = await updateFoundryTool(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryToolHandler error:", err);
    return res.status(500).json({ error: "Failed to update foundry tool" });
  }
};

/**
 * DELETE /foundry/tools/:id
 */
export const deleteFoundryToolHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryTool(id);

    return res.json({
      success: true,
      message: "Tool deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryToolHandler error:", err);
    return res.status(500).json({ error: "Failed to delete foundry tool" });
  }
};

/**
 * GET /foundry/tools/:id/export?mode=raw|format
 * - Kalau ada raw_data / format_data, pakai itu
 * - Fallback ke row penuh kalau nggak ada
 */
export async function exportFoundryToolHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryToolById(id);
    if (!row) {
      return res.status(404).json({ error: "Tool not found" });
    }

    let exported;
    if (mode === "raw" && row.raw_data) {
      exported = row.raw_data;
    } else if (mode === "format" && row.format_data) {
      exported = row.format_data;
    } else {
      exported = row;
    }

    const safeMode = mode === "format" ? "format" : "raw";
    const filename = `${row.name.replace(/\s+/g, "_")}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ exportFoundryToolHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
