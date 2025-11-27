// controllers/foundryFeatureController.js
import {
  bulkInsertFoundryFeatures,
  listFoundryFeatures,
  getFoundryFeatureById,
  updateFoundryFeature,
  deleteFoundryFeature,
} from "../models/foundryFeatureModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(
  /\/$/,
  ""
);

/* ---------------------------------------------
 * IMAGE RESOLVER
 * --------------------------------------------- */
function resolveFeatureImage(systemImg, fallbackImg) {
  let img = systemImg || fallbackImg;
  if (!img) return null;

  // Kalau sudah URL absolut, pakai apa adanya
  if (/^https?:\/\//i.test(img)) {
    return img;
  }

  // Potong dari "icons/..." kalau ada
  const cutIndex = img.indexOf("icons/");
  if (cutIndex !== -1) {
    img = img.substring(cutIndex);
  }

  // Ganti prefix "icons" → "foundryvtt"
  img = img.replace(/^icons/, "foundryvtt");

  if (PUBLIC_MEDIA_URL) {
    return `${PUBLIC_MEDIA_URL}/${img}`;
  }

  return img;
}

function getCompendiumSource(rawItem) {
  return rawItem?._stats?.compendiumSource ?? null;
}

function getSourceBook(system) {
  return system?.source?.book ?? null;
}

/**
 * Price format baru:
 * 1–9   -> "X cp"
 * 10–99 -> (value/10) "sp"
 * >=100 -> (value/100) "gp"
 */
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
 * NORMALISASI FEATURE
 * --------------------------------------------- */
function normalizeFoundryFeature(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid feature JSON");
  }

  const name = raw.name || "Unknown Feature";
  const type = raw.type || "feature";
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
 * Helper untuk membangun payload insert dari array raw items.
 * Dipakai oleh:
 * - importFoundryFeatures (body JSON/array)
 * - importFoundryFeaturesFromFiles (banyak file JSON)
 */
function buildFeaturePayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryFeature(raw);
      const { name, type, system, img } = normalized;

      // kalau mau strict type bisa aktifkan ini:
      // if (type !== "feature") { ... }

      const sysType = system?.type || {};

      const image = resolveFeatureImage(system?.img, img);
      const compendium_source = getCompendiumSource(raw);
      const price = formatPrice(system);
      const source_book = getSourceBook(system);

      payloads.push({
        name,
        type,

        raw_data: raw,
        format_data: normalized,

        type_value: sysType.value ?? null,
        base_item: sysType.baseItem ?? null,
        properties: system?.properties ?? null,
        rarity: system?.rarity ?? null,
        weight: system?.weight?.value ?? null,
        attunement: system?.attunement ?? null,

        price,
        compendium_source,
        source_book,

        image,
      });
    } catch (err) {
      console.error("💥 Normalisasi feature gagal:", err);
      errors.push({
        name: raw?.name || null,
        error: err.message,
      });
    }
  }

  return { payloads, errors };
}

/* ---------------------------------------------
 * IMPORT via body JSON (1 object / array)
 * POST /foundry/features/import
 * --------------------------------------------- */
export const importFoundryFeatures = async (req, res) => {
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

    const { payloads, errors } = buildFeaturePayloads(items);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryFeatures(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryFeatures error:", err);
    return res.status(500).json({ error: "Failed to import foundry features" });
  }
};

/* ---------------------------------------------
 * IMPORT via banyak file JSON (mass import)
 * POST /foundry/features/import-files
 * --------------------------------------------- */
export const importFoundryFeaturesFromFiles = async (req, res) => {
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

    const { payloads, errors } = buildFeaturePayloads(rawItems);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryFeatures(payloads);
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
    console.error("💥 importFoundryFeaturesFromFiles error:", err);
    return res.status(500).json({ error: "Failed to mass import features" });
  }
};

/* ---------------------------------------------
 * LIST
 * GET /foundry/features
 * --------------------------------------------- */
export const listFoundryFeaturesHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryFeatures({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryFeaturesHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry features" });
  }
};

/* ---------------------------------------------
 * DETAIL
 * GET /foundry/features/:id
 * --------------------------------------------- */
export const getFoundryFeatureHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryFeatureById(id);
    if (!row) {
      return res.status(404).json({ error: "Feature not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryFeatureHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry feature" });
  }
};

/* ---------------------------------------------
 * UPDATE FORMAT
 * PUT /foundry/features/:id/format
 * --------------------------------------------- */
export const updateFoundryFeatureFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res
        .status(400)
        .json({ error: "Payload harus berupa JSON object" });
    }

    const updated = await updateFoundryFeature(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryFeatureFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update feature" });
  }
};

/* ---------------------------------------------
 * DELETE
 * DELETE /foundry/features/:id
 * --------------------------------------------- */
export const deleteFoundryFeatureHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryFeature(id);

    return res.json({
      success: true,
      message: "Feature deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryFeatureHandler error:", err);
    return res.status(500).json({ error: "Failed to delete foundry feature" });
  }
};

/* ---------------------------------------------
 * EXPORT
 * GET /foundry/features/:id/export?mode=raw|format
 * --------------------------------------------- */
export async function exportFoundryFeatureHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryFeatureById(id);
    if (!row) {
      return res.status(404).json({ error: "Feature not found" });
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ exportFoundryFeatureHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
