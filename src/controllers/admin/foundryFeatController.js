// controllers/foundryFeatController.js
import {
  bulkInsertFoundryFeats,
  listFoundryFeats,
  getFoundryFeatById,
  deleteFoundryFeat,
  updateFoundryFeat,
} from "../../models/foundryFeatModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(/\/$/, "");

// =================== Helpers ===================

function resolveFeatImage(img) {
  if (!img) return null;

  // kalau sudah absolute URL, langsung pakai
  if (/^https?:\/\//i.test(img)) return img;

  // potong dari "icons/..." (format Foundry)
  const cutIndex = img.indexOf("icons/");
  if (cutIndex !== -1) {
    img = img.substring(cutIndex);
  }

  // replace "icons" jadi "foundryvtt" biar konsisten di media server
  img = img.replace(/^icons/, "foundryvtt");

  if (PUBLIC_MEDIA_URL) {
    return `${PUBLIC_MEDIA_URL}/${img}`;
  }

  return img;
}

function htmlToText(html = "") {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeFoundryFeat(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid feat JSON");
  }

  const name = raw.name || "Unknown Feat";
  const type = raw.type || "feat";
  const img = raw.img || null;

  const system = raw.system ?? {};
  const descriptionHtml = system?.description?.value || "";
  const description = htmlToText(descriptionHtml);

  const source_book = system?.source?.book || null;
  const requirements = system?.requirements || "";

  const typeObj = system?.type || {};
  const feat_type = typeObj.value || null;
  const subtype = typeObj.subtype || null;

  const propsRaw = system?.properties ?? null;
  let properties = null;
  if (Array.isArray(propsRaw)) {
    properties = propsRaw.join(", ");
  } else if (typeof propsRaw === "string") {
    properties = propsRaw;
  } else if (propsRaw && typeof propsRaw === "object") {
    properties = Object.keys(propsRaw).join(", ");
  }

  const advancement = Array.isArray(system?.advancement)
    ? system.advancement
    : [];

  const prerequisitesRaw = system?.prerequisites || {};
  const prerequisites = {
    items: Array.isArray(prerequisitesRaw.items)
      ? prerequisitesRaw.items
      : [],
    repeatable: !!prerequisitesRaw.repeatable,
    level:
      typeof prerequisitesRaw.level === "number"
        ? prerequisitesRaw.level
        : Number(prerequisitesRaw.level) || 0,
  };

  const image = resolveFeatImage(img);

  // format_data bisa kita simpan versi simplified
  const format_data = {
    name,
    type,
    system: {
      description,
      source_book,
      requirements,
      feat_type,
      subtype,
      properties,
      advancement,
      prerequisites,
    },
    image,
  };

  return {
    name,
    type,
    source_book,
    description,
    requirements,
    feat_type,
    subtype,
    properties,
    advancement,
    prerequisites,
    image,
    raw_data: raw,
    format_data,
  };
}

function buildFeatPayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryFeat(raw);

      if (normalized.type !== "feat") {
        errors.push({
          name: normalized.name || raw?.name || null,
          error: `Item type must be "feat", got "${normalized.type}"`,
        });
        continue;
      }

      payloads.push(normalized);
    } catch (err) {
      console.error("💥 Normalisasi feat gagal:", err);
      errors.push({
        name: raw?.name || null,
        error: err.message,
      });
    }
  }

  return { payloads, errors };
}

// =================== Handlers ===================

export const importFoundryFeats = async (req, res) => {
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

    const { payloads, errors } = buildFeatPayloads(items);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryFeats(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryFeats error:", err);
    return res.status(500).json({ error: "Failed to import foundry feats" });
  }
};

export const importFoundryFeatsFromFiles = async (req, res) => {
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

    const { payloads, errors } = buildFeatPayloads(rawItems);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryFeats(payloads);
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
    console.error("💥 importFoundryFeatsFromFiles error:", err);
    return res.status(500).json({ error: "Failed to mass import feats" });
  }
};

export const listFoundryFeatsHandler = async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      q,
      type,          // e.g. "General", "Origin"
      min_level,
      max_level,
      repeatable,    // "true" / "false"
      sort_by,
      sort_order,
    } = req.query;

    const options = {
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      q: q && String(q).trim() ? String(q).trim() : null,
      type: type && String(type).trim() ? String(type).trim() : null,
      minLevel:
        min_level !== undefined && min_level !== ""
          ? Number(min_level)
          : null,
      maxLevel:
        max_level !== undefined && max_level !== ""
          ? Number(max_level)
          : null,
      repeatable:
        repeatable === "true"
          ? true
          : repeatable === "false"
          ? false
          : null, 
      sortBy: sort_by || "created_at", 
      sortOrder: sort_order === "asc" ? "asc" : "desc",
    };

    const rows = await listFoundryFeats(options);

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryFeatsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry feats" });
  }
};


export const getFoundryFeatHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryFeatById(id);
    if (!row) {
      return res.status(404).json({ error: "Feat not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryFeatHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry feat" });
  }
};

export const updateFoundryFeatFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res
        .status(400)
        .json({ error: "Payload harus berupa JSON object" });
    }

    const updated = await updateFoundryFeat(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryFeatFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update feat" });
  }
};

export const deleteFoundryFeatHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryFeat(id);

    return res.json({
      success: true,
      message: "Feat deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryFeatHandler error:", err);
    return res.status(500).json({ error: "Failed to delete foundry feat" });
  }
};

export async function exportFoundryFeatHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query; // "raw" | "format" | "both" (optional)

    const row = await getFoundryFeatById(id);
    if (!row) {
      return res.status(404).json({ error: "Feat not found" });
    }

    let exported;
    if (mode === "format") {
      exported = row.format_data || {};
    } else if (mode === "both") {
      exported = {
        raw_data: row.raw_data || {},
        format_data: row.format_data || {},
      };
    } else {
      // default raw
      exported = row.raw_data || {};
    }

    const safeName = row.name?.replace(/\s+/g, "_") || "item";
    const safeType = row.type?.toLowerCase() || "unknown";
    const safeMode = String(mode).toLowerCase();

    const filename = `${safeName}_${safeType}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ exportFoundryFeatHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
