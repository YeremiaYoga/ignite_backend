// controllers/foundryToolController.js
import {
  bulkInsertFoundryTools,
  listFoundryTools,
  getFoundryToolById,
  deleteFoundryTool,
  updateFoundryTool,
} from "../models/foundryToolModel.js";

/**
 * Normalisasi raw JSON Foundry untuk tool:
 *  - pastikan name, type, img, system, effects ada
 *  - system.source TIDAK diutak-atik (tetap apa adanya)
 */
function normalizeFoundryTool(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid tool JSON");
  }

  const name = raw.name || "Unknown Tool";
  const type = raw.type || "tool";
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
 * POST /foundry/tools/import
 *
 * Body bisa:
 *  - 1 object JSON
 *  - atau array of JSON
 *
 * Contoh single:
 *  { "name": "...", "type": "tool", "system": {...}, "img": "...", "effects": [...] }
 */
export const importFoundryTools = async (req, res) => {
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

    const payloads = [];
    const errors = [];

    for (const raw of items) {
      try {
        const normalized = normalizeFoundryTool(raw);
        const { name, type, system } = normalized;

        const sysType = system?.type || {};

        payloads.push({
          name,
          type,

          // mapping sesuai aturan lo:
          // rarity    = system.rarity
          // base_item = system.type.baseItem
          // tool_type = system.type.value
          // properties = system.properties
          // weight    = system.weight.value
          // attunement= system.attunement
          rarity: system?.rarity ?? null,
          base_item: sysType.baseItem ?? null,
          tool_type: sysType.value ?? null,
          properties: system?.properties ?? null,
          weight: system?.weight?.value ?? null,
          attunement: system?.attunement ?? null,
        });
      } catch (err) {
        console.error("💥 Normalisasi tool gagal:", err);
        errors.push({
          name: raw?.name || null,
          error: err.message,
        });
      }
    }

    let inserted = [];
    if (payloads.length) {
      inserted = await bulkInsertFoundryTools(payloads);
    }

    return res.json({
      success: errors.length === 0,
      imported: inserted.length,
      errors,
      items: inserted,
    });
  } catch (err) {
    console.error("💥 importFoundryTools error:", err);
    return res.status(500).json({ error: "Failed to import foundry tools" });
  }
};

/**
 * GET /foundry/tools
 * ?limit=50&offset=0
 */
export const listFoundryToolsHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const rows = await listFoundryTools({ limit, offset });

    return res.json({
      success: true,
      items: rows,
    });
  } catch (err) {
    console.error("💥 listFoundryToolsHandler error:", err);
    return res.status(500).json({ error: "Failed to list foundry tools" });
  }
};

/**
 * GET /foundry/tools/:id
 */
export const getFoundryToolHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await getFoundryToolById(id);
    if (!row) {
      return res.status(404).json({ error: "Tool not found" });
    }

    return res.json({
      success: true,
      item: row,
    });
  } catch (err) {
    console.error("💥 getFoundryToolHandler error:", err);
    return res.status(500).json({ error: "Failed to get foundry tool" });
  }
};

/**
 * PUT /foundry/tools/:id
 * - update data tool (rarity, base_item, tool_type, dll)
 */
export const updateFoundryToolHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const updated = await updateFoundryTool(id, payload);

    return res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error("💥 updateFoundryToolHandler error:", err);
    return res.status(500).json({ error: "Failed to update foundry tool" });
  }
};

/**
 * DELETE /foundry/tools/:id
 */
export const deleteFoundryToolHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteFoundryTool(id);

    return res.json({
      success: true,
      message: "Tool deleted",
    });
  } catch (err) {
    console.error("💥 deleteFoundryToolHandler error:", err);
    return res.status(500).json({ error: "Failed to delete foundry tool" });
  }
};

/**
 * GET /foundry/tools/:id/export?mode=raw
 *
 * Untuk sekarang export langsung row dari DB.
 * Kalau nanti lo mau simpan raw_data Foundry di tabel, handler ini bisa di-upgrade.
 */
export async function exportFoundryToolHandler(req, res) {
  try {
    const { id } = req.params;
    const { mode = "raw" } = req.query; // disimpan buat konsistensi, walau sekarang belum beda

    const row = await getFoundryToolById(id);
    if (!row) {
      return res.status(404).json({ error: "Tool not found" });
    }

    const exported = row;
    const filename = `${row.name.replace(/\s+/g, "_")}_${mode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    console.error("❌ exportFoundryToolHandler error:", err);
    res.status(500).json({ error: err.message });
  }
}
