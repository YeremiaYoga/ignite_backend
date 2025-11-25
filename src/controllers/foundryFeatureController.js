// controllers/foundryFeatureController.js
import {
  bulkInsertFoundryFeatures,
  listFoundryFeatures,
  getFoundryFeatureById,
  updateFoundryFeature,
  deleteFoundryFeature,
} from "../models/foundryFeatureModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(/\/$/, "");

function resolveFeatureImage(systemImg, fallbackImg) {
  let img = systemImg || fallbackImg;
  if (!img) return null;

  if (/^https?:\/\//i.test(img)) {
    return img;
  }

  const cutIndex = img.indexOf("icons/");
  if (cutIndex !== -1) img = img.substring(cutIndex);
  img = img.replace(/^icons/, "foundryvtt");

  if (PUBLIC_MEDIA_URL) return `${PUBLIC_MEDIA_URL}/${img}`;
  return img;
}

function getCompendiumSource(rawItem) {
  return rawItem?._stats?.compendiumSource ?? null;
}

function getSourceBook(system) {
  return system?.source?.book ?? null;
}

function normalizeFoundryFeature(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid feature JSON");
  }

  const name = raw.name || "Unknown Feature";
  const type = raw.type || "feature";
  const img = raw.img || null;

  const system = raw.system ?? {};
  const effects = Array.isArray(raw.effects) ? raw.effects : [];

  const description =
    system.description?.value ??
    system.description ??
    "";

  return {
    name,
    type,
    img,
    system,
    effects,
    description,
  };
}

// ---- controllers ----

export const importFoundryFeatures = async (req, res) => {
  try {
    const body = req.body;
    let items = [];

    if (Array.isArray(body)) items = body;
    else if (body && typeof body === "object") items = [body];
    else {
      return res.status(400).json({
        error: "Request body must be 1 JSON object or an array of JSON objects",
      });
    }

    if (!items.length) {
      return res.status(400).json({ error: "No items to import" });
    }

    const payloads = [];
    const errors = [];

    for (const raw of items) {
      try {
        const normalized = normalizeFoundryFeature(raw);
        const { name, type, img, system } = normalized;

        const image = resolveFeatureImage(system.img, img);
        const compendium_source = getCompendiumSource(raw);
        const source_book = getSourceBook(system);

        payloads.push({
          name,
          type,
          image,
          compendium_source,
          source_book,
          description: normalized.description,
          raw_data: raw,
          format_data: normalized,
        });
      } catch (err) {
        console.error("💥 normalize feature failed:", err);
        errors.push({
          name: raw?.name || null,
          error: err.message,
        });
      }
    }

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

export const listFoundryFeaturesHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryFeatures({ limit, offset });
    return res.json({ success: true, items: rows });
  } catch (err) {
    console.error("💥 listFoundryFeaturesHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry features" });
  }
};

export const getFoundryFeatureHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getFoundryFeatureById(id);

    if (!row) {
      return res.status(404).json({ error: "Feature not found" });
    }

    return res.json({ success: true, item: row });
  } catch (err) {
    console.error("💥 getFoundryFeatureHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry feature" });
  }
};

export const updateFoundryFeatureFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res
        .status(400)
        .json({ error: "Payload must be a JSON object" });
    }

    const updated = await updateFoundryFeature(id, payload);
    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("💥 updateFoundryFeatureFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update feature" });
  }
};

export const deleteFoundryFeatureHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFoundryFeature(id);

    return res.json({ success: true, message: "Feature deleted" });
  } catch (err) {
    console.error("💥 deleteFoundryFeatureHandler error:", err);
    return res.status(500).json({ error: "Failed to delete feature" });
  }
};

export async function exportFoundryFeatureHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryFeatureById(id);
    if (!row) {
      return res.status(404).json({ error: "Feature not found" });
    }

    let exported;
    if (mode === "format") {
      exported = row.format_data || row.raw_data || row;
    } else {
      exported = row.raw_data || row.format_data || row;
    }

    const filename = `${row.name.replace(/\s+/g, "_")}_${mode}.json`;

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
