// controllers/foundryContainerController.js
import {
  bulkInsertFoundryContainers,
  listFoundryContainers,
  getFoundryContainerById,
  deleteFoundryContainer,
  updateFoundryContainer,
} from "../models/foundryContainerModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(
  /\/$/,
  ""
);


function normalizeFoundryContainer(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid container JSON");
  }

  const name = raw.name || "Unknown Container";
  const type = raw.type || "container";
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


function resolveContainerImage(systemImg, fallbackImg) {
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


function buildContainerPayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryContainer(raw);
      const { name, type, system, img } = normalized;

      if (type !== "container") {
        errors.push({
          name: raw?.name || null,
          error: `Item type must be "container", got "${type}"`,
        });
        continue;
      }

      const weight = system?.weight?.value ?? null;
      const image = resolveContainerImage(system?.img, img);

      const compendium_source = getCompendiumSource(raw);
      const price = formatPrice(system);
      const source_book = getSourceBook(system);

      payloads.push({
        name,
        type,

        raw_data: raw,
        format_data: normalized,

        properties: system?.properties ?? null,
        weight,
        rarity: system?.rarity ?? null,

        compendium_source,
        price,
        source_book,

        attunement: system?.attunement ?? null,
        image,
      });
    } catch (err) {
      console.error("💥 Normalisasi container gagal:", err);
      errors.push({
        name: raw?.name || null,
        error: err.message,
      });
    }
  }

  return { payloads, errors };
}


export const importFoundryContainers = async (req, res) => {
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

    const { payloads, errors } = buildContainerPayloads(items);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryContainers(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryContainers error:", err);
    return res
      .status(500)
      .json({ error: "Failed to import foundry containers" });
  }
};


export const importFoundryContainersFromFiles = async (req, res) => {
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

    const { payloads, errors } = buildContainerPayloads(rawItems);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryContainers(payloads);
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
    console.error("💥 importFoundryContainersFromFiles error:", err);
    return res
      .status(500)
      .json({ error: "Failed to mass import foundry containers" });
  }
};


export const listFoundryContainersHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryContainers({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryContainersHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry containers" });
  }
};


export const getFoundryContainerHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryContainerById(id);
    if (!row) {
      return res.status(404).json({ error: "Container not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryContainerHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry container" });
  }
};


export const updateFoundryContainerHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const updated = await updateFoundryContainer(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryContainerHandler error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update foundry container" });
  }
};


export const deleteFoundryContainerHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryContainer(id);

    return res.json({
      success: true,
      message: "Container deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryContainerHandler error:", err);
    return res
      .status(500)
      .json({ error: "Failed to delete foundry container" });
  }
};


export async function exportFoundryContainerHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryContainerById(id);
    if (!row) {
      return res.status(404).json({ error: "Container not found" });
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
    console.error("❌ exportFoundryContainerHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
