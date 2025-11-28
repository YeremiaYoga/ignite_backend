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

    const userId = req.user?.id || null;
    let items = [];

    for (const t of usedTables) {
      let query = supabase.from(t.table).select("*");

      if (like) query = query.ilike("name", like);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((row) => {
        const favorites = Array.isArray(row.favorites) ? row.favorites : [];
        const favorites_count =
          typeof row.favorites_count === "number"
            ? row.favorites_count
            : favorites.length;

        const is_favorite =
          userId != null
            ? favorites.some((f) => String(f.user_id) === userId)
            : false;

        return {
          __type: t.key,
          __table: t.table,
          __global_id: `${t.key}-${row.id}`,
          favorites_count,
          is_favorite,
          ...row,
        };
      });

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

function getTableByType(typeKey) {
  return TABLES.find((t) => t.key === typeKey) || null;
}

export const toggleFavoriteFoundryItem = async (req, res) => {
  try {
    const { type, id } = req.params;

    const tableInfo = getTableByType(type);
    if (!tableInfo) {
      return res.status(400).json({ error: "Invalid item type" });
    }

    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = String(user.id);
    const username =
      user.username || user.name || user.full_name || user.email || "Unknown";

    // 1. Ambil item
    const { data: item, error: fetchError } = await supabase
      .from(tableInfo.table)
      .select("id, favorites, favorites_count")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("❌ toggleFavorite fetch error:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    let favorites = Array.isArray(item.favorites) ? item.favorites : [];
    const already = favorites.find((f) => String(f.user_id) === userId);

    let action = "";
    if (already) {
      // UNFAVORITE (toggle)
      favorites = favorites.filter((f) => String(f.user_id) !== userId);
      action = "unfavorite";
    } else {
      // FAVORITE
      favorites.push({
        user_id: userId,
        username,
        at: new Date().toISOString(),
      });
      action = "favorite";
    }

    const favorites_count = favorites.length;

    // 2. Update row
    const { data: updated, error: updateError } = await supabase
      .from(tableInfo.table)
      .update({
        favorites,
        favorites_count,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ toggleFavorite update error:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({
      success: true,
      action, // "favorite" atau "unfavorite"
      favorites_count,
      item: updated,
    });
  } catch (err) {
    console.error("❌ toggleFavoriteFoundryItem Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
