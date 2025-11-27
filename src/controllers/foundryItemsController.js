// controllers/foundryItemsController.js
import supabase from "../utils/db.js";

const TABLES = [
  { key: "weapon", table: "foundry_weapons" },
  { key: "consumable", table: "foundry_consumables" },
  { key: "container", table: "foundry_containers" },
  { key: "equipment", table: "foundry_equipments" },
  { key: "loot", table: "foundry_loots" },
  { key: "tool", table: "foundry_tools" },
];

export const getFoundryItems = async (req, res) => {
  try {
    const { type, search } = req.query;
    const like = search ? `%${search.toLowerCase()}%` : null;
    const usedTables = type ? TABLES.filter((t) => t.key === type) : TABLES;

    let items = [];

    for (const t of usedTables) {
      let query = supabase.from(t.table).select("*");

      if (like) query = query.ilike("name", like);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((row) => ({
        __type: t.key,
        __table: t.table,
        __global_id: `${t.key}-${row.id}`,
        ...row,
      }));

      items = items.concat(mapped);
    }

    items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("❌ getFoundryItems Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
