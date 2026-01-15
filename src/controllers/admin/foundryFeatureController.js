// controllers/foundryFeatureController.js
import {
  bulkInsertFoundryFeatures,
  listFoundryFeatures,
  getFoundryFeatureById,
  deleteFoundryFeature,
  updateFoundryFeature,
} from "../../models/foundryFeatureModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(/\/$/, "");

function resolveFeatureImage(itemImg, fallbackImg) {
  let img = itemImg || fallbackImg;
  if (!img) return null;

  if (/^https?:\/\//i.test(img)) return img;

  const cutIndex = img.indexOf("icons/");
  if (cutIndex !== -1) img = img.substring(cutIndex);

  img = img.replace(/^icons/, "foundryvtt");

  return PUBLIC_MEDIA_URL ? `${PUBLIC_MEDIA_URL}/${img}` : img;
}

function stripHtmlToText(html) {
  if (!html) return "";
  const s = String(html);
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getDescription(raw) {

  const html = raw?.system?.description?.value ?? "";
  const txt = stripHtmlToText(html);
  return txt || null;
}

function normalizeRecoveryPeriod(period) {
  const p = String(period || "").trim().toLowerCase();
  if (!p) return null;

  if (p === "lr" || p === "longrest" || p === "long rest") return "Long Rest";
  if (p === "sr" || p === "shortrest" || p === "short rest") return "Short Rest";

  return period;
}

function normalizeRecoveryType(type) {
  const t = String(type || "").trim().toLowerCase();
  if (!t) return null;

  if (t === "recoverall") return "Recovery All Uses";
  if (t === "loseall") return "Lose All Uses";

  return type;
}

function normalizeUses(uses) {
  const u = uses && typeof uses === "object" ? uses : {};

  const max = u.max ?? null;
  const spent = typeof u.spent === "number" ? u.spent : Number(u.spent ?? 0) || 0;

  const recoveryArr = Array.isArray(u.recovery) ? u.recovery : [];
  const recovery = recoveryArr
    .map((r) => ({
      period: normalizeRecoveryPeriod(r?.period),
      type: normalizeRecoveryType(r?.type),
    }))
    .filter((r) => r.period || r.type);

  return {
    max: max === "" ? null : max,
    spent,
    recovery,
  };
}

function normalizeFoundryFeature(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid feature JSON");

  const name = raw?.name || "Unknown Feature";
  const type = raw?.type || "feat";
  const img = raw?.img || null;

  const system = raw?.system ?? {};
  const effects = Array.isArray(raw?.effects) ? raw.effects : [];
  const flags = raw?.flags ?? {};
  const stats = raw?._stats ?? {};

  return { name, type, img, system, effects, flags, stats };
}

function buildFeaturePayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryFeature(raw);
      const { name, type, system, img } = normalized;

      const image = resolveFeatureImage(raw?.img, img);
      const description = getDescription(raw);

      const prerequisites = system?.prerequisites ?? {};
      const properties = Array.isArray(system?.properties) ? system.properties : [];
      const requirements = system?.requirements ?? raw?.system?.requirements ?? raw?.requirements ?? null;

      const uses = normalizeUses(system?.uses);

      payloads.push({
        name,
        type,

        image,
        description,

        raw_data: raw,
        format_data: normalized,

        favorites: [], // default
        favorites_count: 0,

        prerequisites,
        properties,
        requirements: requirements ? String(requirements) : null,
        uses,
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

export const importFoundryFeatures = async (req, res) => {
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

    const { payloads, errors } = buildFeaturePayloads(items);

    let inserted = [];
    if (payloads.length) inserted = await bulkInsertFoundryFeatures(payloads);

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

        if (Array.isArray(parsed)) rawItems.push(...parsed);
        else if (parsed && typeof parsed === "object") rawItems.push(parsed);
        else {
          parseErrors.push({
            file: file.originalname,
            error: "File JSON harus berupa object atau array of object",
          });
        }
      } catch (err) {
        console.error("💥 Gagal parse file JSON:", file.originalname, err);
        parseErrors.push({ file: file.originalname, error: err.message });
      }
    }

    if (!rawItems.length && !parseErrors.length) {
      return res.status(400).json({
        error: "Tidak ada item JSON valid yang ditemukan di file upload",
      });
    }

    const { payloads, errors } = buildFeaturePayloads(rawItems);

    let inserted = [];
    if (payloads.length) inserted = await bulkInsertFoundryFeatures(payloads);

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
    if (!row) return res.status(404).json({ error: "Feature not found" });

    return res.json({ success: true, item: row });
  } catch (err) {
    console.error("💥 getFoundryFeatureHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry feature" });
  }
};

export const updateFoundryFeatureHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Payload harus berupa JSON object" });
    }

    const updated = await updateFoundryFeature(id, payload);

    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("💥 updateFoundryFeatureHandler error:", err);
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
    return res.status(500).json({ error: "Failed to delete foundry feature" });
  }
};

export async function exportFoundryFeatureHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryFeatureById(id);
    if (!row) return res.status(404).json({ error: "Feature not found" });

    const exported =
      mode === "format"
        ? row.format_data
        : mode === "raw"
          ? row.raw_data
          : row;

    const safeName = String(row.name || "item").replace(/\s+/g, "_");
    const safeType = String(row.type || "unknown").toLowerCase();
    const safeMode = String(mode || "raw").toLowerCase();

    const filename = `${safeName}_${safeType}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ export handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
