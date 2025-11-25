// controllers/foundryLootController.js
import {
  bulkInsertFoundryLoots,
  listFoundryLoots,
  getFoundryLootById,
  updateFoundryLoot,
  deleteFoundryLoot,
} from "../models/foundryLootModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(/\/$/, "");

// ----- helpers -----
function resolveLootImage(systemImg, fallbackImg) {
  let img = systemImg || fallbackImg;
  if (!img) return null;

  if (/^https?:\/\//i.test(img)) {
    return img;
  }

  const cutIndex = img.indexOf("icons/");
  if (cutIndex !== -1) {
    img = img.substring(cutIndex);
  }
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

function getPriceInCp(system) {
  const price = system?.price;
  if (!price) return null;

  const value = Number(price.value ?? 0);
  if (!Number.isFinite(value)) return null;

  const denom = (price.denomination || "cp").toLowerCase();

  let mult = 1;
  switch (denom) {
    case "sp":
      mult = 10;
      break;
    case "ep":
      mult = 50;
      break;
    case "gp":
      mult = 100;
      break;
    case "pp":
      mult = 1000;
      break;
    default:
      mult = 1;
  }

  return value * mult;
}

function normalizeFoundryLoot(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid loot JSON");
  }

  const name = raw.name || "Unknown Loot";
  const type = raw.type || "loot";
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

// ----- controllers -----

export const importFoundryLoots = async (req, res) => {
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
        const normalized = normalizeFoundryLoot(raw);
        const { name, type, img, system } = normalized;

        if (type !== "loot" && type !== "equipment") {
          // still allow but you can restrict if mau
        }

        const image = resolveLootImage(system.img, img);
        const compendium_source = getCompendiumSource(raw);
        const price = getPriceInCp(system);
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
        console.error("💥 normalize loot failed:", err);
        errors.push({
          name: raw?.name || null,
          error: err.message,
        });
      }
    }

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

export const getFoundryLootHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getFoundryLootById(id);

    if (!row) {
      return res.status(404).json({ error: "Loot not found" });
    }

    return res.json({ success: true, item: row });
  } catch (err) {
    console.error("💥 getFoundryLootHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry loot" });
  }
};

export const updateFoundryLootFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res
        .status(400)
        .json({ error: "Payload must be a JSON object" });
    }

    const updated = await updateFoundryLoot(id, payload);
    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("💥 updateFoundryLootFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update loot" });
  }
};

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

export async function exportFoundryLootHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryLootById(id);
    if (!row) {
      return res.status(404).json({ error: "Loot not found" });
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
    console.error("❌ exportFoundryLootHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
