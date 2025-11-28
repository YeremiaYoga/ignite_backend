// controllers/foundryToolController.js
import {
  bulkInsertFoundryTools,
  listFoundryTools,
  getFoundryToolById,
  deleteFoundryTool,
  updateFoundryTool,
} from "../models/foundryToolModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(
  /\/$/,
  ""
);


function resolveToolImage(systemImg, fallbackImg) {
  let img = systemImg || fallbackImg;
  if (!img) return null;

  if (/^https?:\/\//i.test(img)) return img;

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


function normalizeFoundryTool(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid tool JSON");

  return {
    name: raw.name || "Unknown Tool",
    type: raw.type || "tool",
    img: raw.img || raw.system?.img || null,
    system: raw.system ?? {},
    effects: Array.isArray(raw.effects) ? raw.effects : [],
  };
}


function buildToolPayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryTool(raw);
      const { name, type, system, img } = normalized;

      if (type !== "tool") {
        errors.push({
          name: raw?.name || null,
          error: `Item type must be "tool", got "${type}"`,
        });
        continue;
      }

      const sysType = system?.type || {};

      const image = resolveToolImage(system?.img, img);

      payloads.push({
        name,
        type,

        raw_data: raw,
        format_data: normalized,

        rarity: system?.rarity ?? null,
        base_item: sysType.baseItem ?? null,
        type_value: sysType.value ?? null,
        properties: system?.properties ?? null,
        weight: system?.weight?.value ?? null,
        attunement: system?.attunement ?? null,

        compendium_source: getCompendiumSource(raw),
        price: formatPrice(system),
        source_book: getSourceBook(system),

        image,
      });
    } catch (err) {
      errors.push({ name: raw?.name, error: err.message });
    }
  }

  return { payloads, errors };
}


export const importFoundryTools = async (req, res) => {
  try {
    const body = req.body;

    let items = [];
    if (Array.isArray(body)) items = body;
    else if (body && typeof body === "object") items = [body];
    else
      return res.status(400).json({
        error: "Request body harus berupa 1 JSON object atau array",
      });

    if (!items.length)
      return res.status(400).json({ error: "Tidak ada item untuk import" });

    const { payloads, errors } = buildToolPayloads(items);

    let inserted = [];
    if (payloads.length) inserted = await bulkInsertFoundryTools(payloads);

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryTools error:", err);
    res.status(500).json({ error: "Failed to import foundry tools" });
  }
};


export const importFoundryToolsFromFiles = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length)
      return res.status(400).json({ error: "Tidak ada file di-upload" });

    const rawItems = [];
    const parseErrors = [];

    for (const file of files) {
      try {
        const parsed = JSON.parse(file.buffer.toString("utf8"));
        if (Array.isArray(parsed)) rawItems.push(...parsed);
        else if (parsed && typeof parsed === "object") rawItems.push(parsed);
        else
          parseErrors.push({
            file: file.originalname,
            error: "File harus 1 object atau array",
          });
      } catch (err) {
        parseErrors.push({
          file: file.originalname,
          error: err.message,
        });
      }
    }

    if (!rawItems.length && !parseErrors.length)
      return res
        .status(400)
        .json({ error: "Tidak ada item JSON valid di file upload" });

    const { payloads, errors } = buildToolPayloads(rawItems);

    let inserted = [];
    if (payloads.length) inserted = await bulkInsertFoundryTools(payloads);

    return res.json({
      success: parseErrors.length === 0 && errors.length === 0,
      imported: inserted.length,
      totalFiles: files.length,
      totalParsedItems: rawItems.length,
      errors: [...parseErrors, ...errors],
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryToolsFromFiles error:", err);
    res.status(500).json({ error: "Failed to import tools (files)" });
  }
};


export const listFoundryToolsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryTools({ limit, offset });
    res.json({ success: true, items: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to list tools" });
  }
};

export const getFoundryToolHandler = async (req, res) => {
  try {
    const row = await getFoundryToolById(req.params.id);
    if (!row) return res.status(404).json({ error: "Tool not found" });
    res.json({ success: true, item: row });
  } catch (err) {
    res.status(500).json({ error: "Failed to get tool" });
  }
};

export const updateFoundryToolHandler = async (req, res) => {
  try {
    const updated = await updateFoundryTool(req.params.id, req.body || {});
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tool" });
  }
};

export const deleteFoundryToolHandler = async (req, res) => {
  try {
    await deleteFoundryTool(req.params.id);
    res.json({ success: true, message: "Tool deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tool" });
  }
};

export async function exportFoundryToolHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryToolById(id);
    if (!row) return res.status(404).json({ error: "Tool not found" });

    let exported =
      mode === "format" && row.format_data
        ? row.format_data
        : mode === "raw" && row.raw_data
        ? row.raw_data
        : row;

    const safeName = row.name?.replace(/\s+/g, "_") || "item";
    const safeType = row.type?.toLowerCase() || "unknown";

    const filename = `${safeName}_${safeType}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(exported, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
