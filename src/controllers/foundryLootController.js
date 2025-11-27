// controllers/foundryLootController.js
import {
  bulkInsertFoundryLoots,
  listFoundryLoots,
  getFoundryLootById,
  updateFoundryLoot,
  deleteFoundryLoot,
} from "../models/foundryLootModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(
  /\/$/,
  ""
);

/* ---------------------------------------------
 * IMAGE RESOLVER
 * --------------------------------------------- */
function resolveLootImage(systemImg, fallbackImg) {
  let img = systemImg || fallbackImg;
  if (!img) return null;

  // absolute URL
  if (/^https?:\/\//i.test(img)) {
    return img;
  }

  // potong dari "icons/"
  const cutIndex = img.indexOf("icons/");
  if (cutIndex !== -1) img = img.substring(cutIndex);

  img = img.replace(/^icons/, "foundryvtt");

  if (PUBLIC_MEDIA_URL) return `${PUBLIC_MEDIA_URL}/${img}`;
  return img;
}

/* ---------------------------------------------
 * HELPERS: compendium / source / price
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
 * NORMALIZER
 * --------------------------------------------- */
function normalizeFoundryLoot(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid loot JSON");
  }

  const name = raw.name || "Unknown Loot";
  const type = raw.type || "loot";
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
 * BUILD PAYLOADS
 * --------------------------------------------- */
function buildLootPayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryLoot(raw);
      const { name, type, img, system } = normalized;

      const image = resolveLootImage(system.img, img);
      const compendium_source = getCompendiumSource(raw);
      const price = formatPrice(system);
      const source_book = getSourceBook(system);

      const sysType = system?.type || {};

      payloads.push({
        name,
        type,
        type_value: sysType.value ?? null,
        base_item: sysType.baseItem ?? null,
        properties: system?.properties ?? null,
        rarity: system?.rarity ?? null,
        weight: system?.weight?.value ?? null,
        image,
        price,
        compendium_source,
        source_book,

        raw_data: raw,
        format_data: normalized,
      });
    } catch (err) {
      errors.push({
        name: raw?.name || null,
        error: err.message,
      });
    }
  }

  return { payloads, errors };
}

/* ---------------------------------------------
 * IMPORT VIA JSON BODY
 * POST /foundry/loots/import
 * --------------------------------------------- */
export const importFoundryLoots = async (req, res) => {
  try {
    const body = req.body;
    let items = [];

    if (Array.isArray(body)) items = body;
    else if (body && typeof body === "object") items = [body];
    else {
      return res.status(400).json({
        error: "Request body must be 1 JSON object or array of JSON objects",
      });
    }

    if (!items.length)
      return res.status(400).json({ error: "No items to import" });

    const { payloads, errors } = buildLootPayloads(items);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryLoots(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryLoots error:", err);
    return res.status(500).json({ error: "Failed to import foundry loots" });
  }
};

/* ---------------------------------------------
 * IMPORT VIA FILE UPLOADS
 * POST /foundry/loots/import-files
 * --------------------------------------------- */
export const importFoundryLootsFromFiles = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded for import" });
    }

    const rawItems = [];
    const parseErrors = [];

    for (const file of files) {
      try {
        const parsed = JSON.parse(file.buffer.toString("utf8"));

        if (Array.isArray(parsed)) rawItems.push(...parsed);
        else if (parsed && typeof parsed === "object") rawItems.push(parsed);
        else {
          parseErrors.push({
            file: file.originalname,
            error: "File JSON must be an object or array of objects",
          });
        }
      } catch (err) {
        parseErrors.push({
          file: file.originalname,
          error: err.message,
        });
      }
    }

    if (!rawItems.length && !parseErrors.length) {
      return res
        .status(400)
        .json({ error: "No valid JSON items found in files" });
    }

    const { payloads, errors } = buildLootPayloads(rawItems);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryLoots(payloads);
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
    console.error("💥 importFoundryLootsFromFiles error:", err);
    return res.status(500).json({ error: "Failed to mass import loots" });
  }
};

/* ---------------------------------------------
 * LIST
 * GET /foundry/loots
 * --------------------------------------------- */
export const listFoundryLootsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryLoots({ limit, offset });
    return res.json({ success: true, items: rows });
  } catch (err) {
    console.error("💥 listFoundryLootsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry loots" });
  }
};

/* ---------------------------------------------
 * DETAIL
 * GET /foundry/loots/:id
 * --------------------------------------------- */
export const getFoundryLootHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getFoundryLootById(id);

    if (!row) return res.status(404).json({ error: "Loot not found" });

    return res.json({ success: true, item: row });
  } catch (err) {
    console.error("💥 getFoundryLootHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry loot" });
  }
};

/* ---------------------------------------------
 * UPDATE
 * PUT /foundry/loots/:id/format
 * --------------------------------------------- */
export const updateFoundryLootFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Payload must be a JSON object" });
    }

    const updated = await updateFoundryLoot(id, payload);
    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("💥 updateFoundryLootFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update loot" });
  }
};

/* ---------------------------------------------
 * DELETE
 * DELETE /foundry/loots/:id
 * --------------------------------------------- */
export const deleteFoundryLootHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFoundryLoot(id);

    return res.json({ success: true, message: "Loot deleted" });
  } catch (err) {
    console.error("💥 deleteFoundryLootHandler error:", err);
    return res.status(500).json({ error: "Failed to delete loot" });
  }
};

/* ---------------------------------------------
 * EXPORT
 * GET /foundry/loots/:id/export?mode=raw|format
 * --------------------------------------------- */
export async function exportFoundryLootHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryLootById(id);
    if (!row) return res.status(404).json({ error: "Loot not found" });

    const exported =
      mode === "format"
        ? row.format_data || row.raw_data || row
        : row.raw_data || row.format_data || row;

    const safeMode = mode === "format" ? "format" : "raw";
    const filename = `${row.name.replace(/\s+/g, "_")}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ exportFoundryLootHandler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
