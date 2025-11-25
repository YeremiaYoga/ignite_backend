// controllers/foundrySpellController.js
import {
  bulkInsertFoundrySpells,
  listFoundrySpells,
  getFoundrySpellById,
  updateFoundrySpell,
  deleteFoundrySpell,
} from "../models/foundrySpellModel.js";

const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "").replace(/\/$/, "");

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

function normalizeFoundrySpell(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid spell JSON");
  }

  const name = raw.name || "Unknown Spell";
  const type = raw.type || "spell";
  const img = raw.img || null;

  const system = raw.system ?? {};
  const effects = Array.isArray(raw.effects) ? raw.effects : [];

  const description =
    system.description?.value ??
    system.description ??
    "";

  const material =
    system.materials?.value ??
    system.material ??
    "";

  const target = system.target?.value ?? null;
  const affected = system.target?.type ?? null;

  let range = null;
  if (system.range?.value != null) {
    range = `${system.range.value} ${system.range.units || ""}`.trim();
  } else if (typeof system.range === "string") {
    range = system.range;
  }

  let duration = null;
  if (system.duration?.value != null) {
    duration = `${system.duration.value} ${system.duration.units || ""}`.trim();
  } else if (typeof system.duration === "string") {
    duration = system.duration;
  }

  const activation = system.activation?.type ?? null;

  return {
    name,
    type,
    img,
    system,
    effects,
    description,
    material,
    target,
    affected,
    range,
    activation,
    duration,
  };
}

// ---- controllers ----

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

    const payloads = [];
    const errors = [];

    for (const raw of items) {
      try {
        const normalized = normalizeFoundrySpell(raw);
        const { name, type, img, system } = normalized;

        if (type !== "spell") {
          // masih boleh, cuma kalau mau strict bisa di-check
        }

        const image = resolveSpellImage(system.img, img);
        const compendium_source = getCompendiumSource(raw);
        const source_book = getSourceBook(system);

        payloads.push({
          name,
          type,
          properties: system.properties ?? null,
          level: system.level ?? null,
          school: system.school ?? null,
          description: normalized.description,
          material: normalized.material,
          target: normalized.target,
          affected: normalized.affected,
          range: normalized.range,
          activation: normalized.activation,
          duration: normalized.duration,
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
      return res
        .status(400)
        .json({ error: "Payload must be a JSON object" });
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
    console.error("❌ exportFoundrySpellHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
