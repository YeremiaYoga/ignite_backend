// controllers/foundryWeaponController.js
import {
  bulkInsertFoundryWeapons,
  listFoundryWeapons,
  getFoundryWeaponById,
  deleteFoundryWeapon,
  updateFoundryWeapon,
} from "../models/foundryWeaponModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(
  /\/$/,
  ""
);

function resolveWeaponImage(systemImg, fallbackImg) {
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

function formatPrice(system) {
  const price = system?.price;
  if (!price) return null;

  const value = Number(price.value ?? 0);
  if (!Number.isFinite(value)) return null;

  // if (value < 10) {
  //   return `${value} cp`;
  // }
  // if (value < 100) {
  //   const sp = value / 10;
  //   return `${sp} sp`;
  // }
  // const gp = value / 100;
  // return `${gp} gp`;
  return value;
}

function normalizeFoundryWeapon(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid weapon JSON");
  }

  const name = raw.name || "Unknown Weapon";
  const type = raw.type || "weapon";
  const img = raw.img || null;

  const systemRaw = raw.system ?? {};
  const effects = Array.isArray(raw.effects) ? raw.effects : [];

  const system = systemRaw;

  return {
    name,
    type,
    img,
    system,
    effects,
  };
}

function buildWeaponPayloads(rawItems) {
  const payloads = [];
  const errors = [];

  for (const raw of rawItems) {
    try {
      const normalized = normalizeFoundryWeapon(raw);
      const { name, type, system, img } = normalized;

      if (type !== "weapon") {
        errors.push({
          name: name || raw?.name || null,
          error: `Item type must be "weapon", got "${type}"`,
        });
        continue;
      }

      const sysType = system?.type || {};
      const dmgBase = system?.damage?.base || {};

      const image = resolveWeaponImage(system?.img, img);

      const compendium_source = getCompendiumSource(raw);
      const price = formatPrice(system);
      const source_book = getSourceBook(system);

      payloads.push({
        name,
        type,

        raw_data: raw,
        format_data: normalized,

        rarity: system?.rarity ?? null,
        base_item: sysType.baseItem ?? null,
        type_value: sysType.value ?? null,
        damage_type: dmgBase.types ?? null,
        attunement: system?.attunement ?? null,
        properties: system?.properties ?? null,
        weight: system?.weight?.value ?? null,
        mastery: system?.mastery ?? null,

        compendium_source,
        price,
        source_book,

        image,
      });
    } catch (err) {
      console.error("💥 Normalisasi weapon gagal:", err);
      errors.push({
        name: raw?.name || null,
        error: err.message,
      });
    }
  }

  return { payloads, errors };
}


export const importFoundryWeapons = async (req, res) => {
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

    const { payloads, errors } = buildWeaponPayloads(items);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryWeapons(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryWeapons error:", err);
    return res.status(500).json({ error: "Failed to import foundry weapons" });
  }
};

/**
 * IMPORT via banyak file JSON (mass import via upload).
 * - Diasumsikan pakai multer: upload.array("files")
 * - Tiap file bisa:
 *    - 1 weapon object
 *    - atau array weapon objects (export-an Foundry)
 *
 * Contoh router:
 *   router.post(
 *     "/api/foundry/weapons/import-files",
 *     upload.array("files"),
 *     importFoundryWeaponsFromFiles
 *   );
 */
export const importFoundryWeaponsFromFiles = async (req, res) => {
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

    const { payloads, errors } = buildWeaponPayloads(rawItems);

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryWeapons(payloads);
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
    console.error("💥 importFoundryWeaponsFromFiles error:", err);
    return res.status(500).json({ error: "Failed to mass import weapons" });
  }
};

export const listFoundryWeaponsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryWeapons({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryWeaponsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry weapons" });
  }
};

export const getFoundryWeaponHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryWeaponById(id);
    if (!row) {
      return res.status(404).json({ error: "Weapon not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryWeaponHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry weapon" });
  }
};

export const updateFoundryWeaponFormatHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res
        .status(400)
        .json({ error: "Payload harus berupa JSON object" });
    }

    const updated = await updateFoundryWeapon(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryWeaponFormatHandler error:", err);
    return res.status(500).json({ error: "Failed to update weapon" });
  }
};

export const deleteFoundryWeaponHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryWeapon(id);

    return res.json({
      success: true,
      message: "Weapon deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryWeaponHandler error:", err);
    return res.status(500).json({ error: "Failed to delete foundry weapon" });
  }
};

export async function exportFoundryWeaponHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query;

    const row = await getFoundryWeaponById(id);
    if (!row) {
      return res.status(404).json({ error: "Weapon not found" });
    }

    const exported = row; // kalau mau mode 'raw' / 'format_data' tinggal di-switch di sini
    const safeName = row.name?.replace(/\s+/g, "_") || "item";
    const safeType = row.type?.toLowerCase() || "unknown";

    const filename = `${safeName}_${safeType}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ export handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
