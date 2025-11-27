// controllers/foundryConsumableController.js
import {
  bulkInsertFoundryConsumables,
  listFoundryConsumables,
  getFoundryConsumableById,
  deleteFoundryConsumable,
  updateFoundryConsumable,
} from "../models/foundryConsumableModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(
  /\/$/,
  ""
);

/* ---------------------------------------------
 * NORMALIZER
 * --------------------------------------------- */
function normalizeFoundryConsumable(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid consumable JSON");
  }

  const name = raw.name || "Unknown Consumable";
  const type = raw.type || "consumable";
  const img = raw.img || raw.system?.img || null;

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

/* ---------------------------------------------
 * IMAGE RESOLVER (seragam dengan weapon/tool)
 * --------------------------------------------- */
function resolveConsumableImage(systemImg, fallbackImg) {
  let img = systemImg || fallbackImg;
  if (!img) return null;

  // absolute URL
  if (/^https?:\/\//i.test(img)) {
    return img;
  }

  // kalau mengandung "icons/", potong dari sana
  const cutIndex = img.indexOf("icons/");
  if (cutIndex !== -1) {
    img = img.substring(cutIndex);
  }

  // ganti prefix "icons" → "foundryvtt"
  img = img.replace(/^icons/, "foundryvtt");

  if (PUBLIC_MEDIA_URL) {
    return `${PUBLIC_MEDIA_URL}/${img}`;
  }

  return img;
}

/* ---------------------------------------------
 * HELPERS: compendium, source, price
 * --------------------------------------------- */
function getCompendiumSource(rawItem) {
  return rawItem?._stats?.compendiumSource ?? null;
}

function getSourceBook(system) {
  return system?.source?.book ?? null;
}

function formatPrice(system) {
  const price = system?.price;
  if (!price) return null;

  const value = Number(price.value ?? 0);
  if (!Number.isFinite(value)) return null;

  const denom = (price.denomination || "cp").toLowerCase();
  const table = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
  const mult = table[denom] ?? 1;

  return value * mult;
}

/* ---------------------------------------------
 * BUILD PAYLOADS (mirip weapon/tool)
 * --------------------------------------------- */
function buildConsumablePayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryConsumable(raw);
      const { name, type, system, img } = normalized;

      if (type !== "consumable") {
        errors.push({
          name: raw?.name || null,
          error: `Item type must be "consumable", got "${type}"`,
        });
        continue;
      }

      const sysType = system?.type || {};
      const weight = system?.weight?.value ?? null;
      const image = resolveConsumableImage(system?.img, img);

      const compendium_source = getCompendiumSource(raw);
      const price = formatPrice(system);
      const source_book = getSourceBook(system);

      payloads.push({
        name,
        type,

        raw_data: raw,
        format_data: normalized,

        type_value: sysType.value ?? null,
        subtype: sysType.subtype ?? null,
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
      console.error("💥 Normalisasi consumable gagal:", err);
      errors.push({
        name: raw?.name || null,
        error: err.message,
      });
    }
  }

  return { payloads, errors };
}

/* ---------------------------------------------
 * IMPORT VIA BODY JSON
 * POST /foundry/consumables/import
 * --------------------------------------------- */
export const importFoundryConsumables = async (req, res) => {
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

    const { payloads, errors } = buildConsumablePayloads(items);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryConsumables(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryConsumables error:", err);
    return res
      .status(500)
      .json({ error: "Failed to import foundry consumables" });
  }
};

/* ---------------------------------------------
 * IMPORT VIA FILES (mass import)
 * POST /foundry/consumables/import-files
 * --------------------------------------------- */
export const importFoundryConsumablesFromFiles = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res
        .status(400)
        .json({ error: "Tidak ada file yang di-upload untuk diimport" });
    }

    const rawItems = [];
    const parseErrors = [];

    for (const file of files) {
      try {
        const text = file.buffer.toString("utf8");
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {
          rawItems.push(...parsed);
        } else if (parsed && typeof parsed === "object") {
          rawItems.push(parsed);
        } else {
          parseErrors.push({
            file: file.originalname,
            error: "File JSON harus berupa object atau array of object",
          });
        }
      } catch (err) {
        console.error("💥 Gagal parse file JSON:", file.originalname, err);
        parseErrors.push({
          file: file.originalname,
          error: err.message,
        });
      }
    }

    if (!rawItems.length && !parseErrors.length) {
      return res.status(400).json({
        error: "Tidak ada item JSON valid yang ditemukan di file upload",
      });
    }

    const { payloads, errors } = buildConsumablePayloads(rawItems);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryConsumables(payloads);
    }

    return res.json({
      success: parseErrors.length === 0 && errors.length === 0,
      imported: inserted.length,
      totalFiles: files.length,
      totalParsedItems: rawItems.length,
      errors: [...parseErrors, ...errors],
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryConsumablesFromFiles error:", err);
    return res
      .status(500)
      .json({ error: "Failed to mass import foundry consumables" });
  }
};

/* ---------------------------------------------
 * LIST
 * GET /foundry/consumables
 * --------------------------------------------- */
export const listFoundryConsumablesHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryConsumables({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryConsumablesHandler error:", err);
    return res
      .status(500)
      .json({ error: "Failed to list foundry consumables" });
  }
};

/* ---------------------------------------------
 * DETAIL
 * GET /foundry/consumables/:id
 * --------------------------------------------- */
export const getFoundryConsumableHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryConsumableById(id);
    if (!row) {
      return res.status(404).json({ error: "Consumable not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryConsumableHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry consumable" });
  }
};

/* ---------------------------------------------
 * UPDATE
 * PUT /foundry/consumables/:id
 * --------------------------------------------- */
export const updateFoundryConsumableHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const updated = await updateFoundryConsumable(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryConsumableHandler error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update foundry consumable" });
  }
};

/* ---------------------------------------------
 * DELETE
 * DELETE /foundry/consumables/:id
 * --------------------------------------------- */
export const deleteFoundryConsumableHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryConsumable(id);

    return res.json({
      success: true,
      message: "Consumable deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryConsumableHandler error:", err);
    return res
      .status(500)
      .json({ error: "Failed to delete foundry consumable" });
  }
};

/* ---------------------------------------------
 * EXPORT
 * GET /foundry/consumables/:id/export?mode=raw|format
 * --------------------------------------------- */
export async function exportFoundryConsumableHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryConsumableById(id);
    if (!row) {
      return res.status(404).json({ error: "Consumable not found" });
    }

    let exported;
    if (mode === "format" && row.format_data) {
      exported = row.format_data;
    } else if (mode === "raw" && row.raw_data) {
      exported = row.raw_data;
    } else {
      exported = row;
    }

    const safeMode = mode === "format" ? "format" : "raw";
    const safeName = row.name?.replace(/\s+/g, "_") || "item";
    const safeType = row.type?.toLowerCase() || "unknown";

    const filename = `${safeName}_${safeType}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ exportFoundryConsumableHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
