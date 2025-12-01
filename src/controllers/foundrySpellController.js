// controllers/foundrySpellController.js
import {
  bulkInsertFoundrySpells,
  listFoundrySpells,
  getFoundrySpellById,
  updateFoundrySpell,
  deleteFoundrySpell,
} from "../models/foundrySpellModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(
  /\/$/,
  ""
);

function resolveSpellImage(systemImg, fallbackImg) {
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

/**
 * Normalisasi 1 spell dari Foundry → bentuk yang siap jadi payload DB.
 * Bagian kompleks (activation, range, template, materials, duration)
 * kita simpan sebagai objek mentah (raw) dari system.
 */
function normalizeFoundrySpell(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid spell JSON");
  }

  const name = raw.name || "Unknown Spell";
  const type = raw.type || "spell";
  const img = raw.img || raw.system?.img || null;

  const system = raw.system ?? {};
  const effects = Array.isArray(raw.effects) ? raw.effects : [];

  const description = system.description?.value ?? system.description ?? "";
  const affects = system.target?.affects ?? null;

  // langsung ambil objek mentahnya
  const activation = system.activation ?? null;
  const range = system.range ?? null;
  const template = system.target?.template ?? null;
  const materials = system.materials ?? null;
  const duration = system.duration ?? null;

  return {
    name,
    type,
    img,
    system,
    effects,
    description,
    affects,
    activation,
    range,
    template,
    materials,
    duration,
  };
}

/**
 * Build payload array untuk insert ke DB
 */
function buildSpellPayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundrySpell(raw);
      const {
        name,
        type,
        img,
        system,
        description,
        affects,
        activation,
        range,
        template,
        materials,
        duration,
      } = normalized;

      const image = resolveSpellImage(system.img, img);
      const compendium_source = getCompendiumSource(raw);
      const source_book = getSourceBook(system);
      const price = formatPrice(system);

      payloads.push({
        name,
        type,
        properties: system.properties ?? null,
        level: system.level ?? null,
        school: system.school ?? null,

        description,
        affects,

        // objek langsung → JSONB
        activation,
        range,
        template,
        materials,
        duration,

        price,
        image,
        compendium_source,
        source_book,

        raw_data: raw,
        format_data: normalized,
      });
    } catch (err) {
      console.error("💥 normalize spell failed:", err);
      errors.push({
        name: raw?.name || null,
        error: err.message,
      });
    }
  }

  return { payloads, errors };
}

/**
 * Import dari JSON body
 */
export const importFoundrySpells = async (req, res) => {
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

    const { payloads, errors } = buildSpellPayloads(items);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundrySpells(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundrySpells error:", err);
    return res.status(500).json({ error: "Failed to import foundry spells" });
  }
};

/**
 * Import dari file upload
 */
export const importFoundrySpellsFromFiles = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded for import" });
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
            error: "File JSON must be an object or array of objects",
          });
        }
      } catch (err) {
        console.error("💥 Failed to parse JSON file:", file.originalname, err);
        parseErrors.push({
          file: file.originalname,
          error: err.message,
        });
      }
    }

    if (!rawItems.length && !parseErrors.length) {
      return res.status(400).json({
        error: "No valid JSON items found in uploaded files",
      });
    }

    const { payloads, errors } = buildSpellPayloads(rawItems);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundrySpells(payloads);
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
    console.error("💥 importFoundrySpellsFromFiles error:", err);
    return res.status(500).json({ error: "Failed to mass import spells" });
  }
};

export const listFoundrySpellsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundrySpells({ limit, offset });
    return res.json({ success: true, items: rows });
  } catch (err) {
    console.error("💥 listFoundrySpellsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry spells" });
  }
};

export const getFoundrySpellHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getFoundrySpellById(id);

    if (!row) {
      return res.status(404).json({ error: "Spell not found" });
    }

    return res.json({ success: true, item: row });
  } catch (err) {
    console.error("💥 getFoundrySpellHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry spell" });
  }
};

export const updateFoundrySpellFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Payload must be a JSON object" });
    }

    const updated = await updateFoundrySpell(id, payload);
    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("💥 updateFoundrySpellFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update spell" });
  }
};

export const deleteFoundrySpellHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFoundrySpell(id);

    return res.json({ success: true, message: "Spell deleted" });
  } catch (err) {
    console.error("💥 deleteFoundrySpellHandler error:", err);
    return res.status(500).json({ error: "Failed to delete spell" });
  }
};

export async function exportFoundrySpellHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundrySpellById(id);
    if (!row) {
      return res.status(404).json({ error: "Spell not found" });
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
    console.error("❌ exportFoundrySpellHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
