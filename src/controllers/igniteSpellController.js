// controllers/igniteSpellController.js
import supabase from "../utils/db.js";

const SPELL_TABLE = "foundry_spells";

/**
 * GET /foundry/spells/all
 */
export const getIgniteSpells = async (req, res) => {
  try {
    const { search, school, level } = req.query;

    const userId = req.user?.id || null;
    let query = supabase.from(SPELL_TABLE).select("*");

    // search by name (case-insensitive)
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      query = query.ilike("name", like);
    }

    // filter by school
    if (school) {
      query = query.ilike("school", school);
    }

    // filter by level
    if (level !== undefined) {
      const lvl = Number(level);
      if (!isNaN(lvl)) query = query.eq("level", lvl);
    }

    const { data, error } = await query;
    if (error) throw error;

    const spells = (data || []).map((row) => {
      const favorites = Array.isArray(row.favorites) ? row.favorites : [];
      const favorites_count =
        typeof row.favorites_count === "number"
          ? row.favorites_count
          : favorites.length;

      const is_favorite =
        userId != null
          ? favorites.some((f) => String(f.user_id) === String(userId))
          : false;

      return {
        __type: "spell",
        __table: SPELL_TABLE,
        __global_id: `spell-${row.id}`,
        favorites_count,
        is_favorite,
        ...row,
      };
    });

    spells.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return res.json({
      success: true,
      count: spells.length,
      spells,
    });
  } catch (err) {
    console.error("❌ getIgniteSpells Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /foundry/spells/:id/favorite
 */
export const toggleFavoriteIgniteSpell = async (req, res) => {
  try {
    const { id } = req.params;

    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = String(user.id);
    const username =
      user.username || user.name || user.full_name || user.email || "Unknown";

    // ambil spellnya
    const { data: spell, error: fetchError } = await supabase
      .from(SPELL_TABLE)
      .select("id, favorites, favorites_count")
      .eq("id", id)
      .single();

    if (fetchError || !spell) {
      return res.status(404).json({ error: "Spell not found" });
    }

    let favorites = Array.isArray(spell.favorites) ? spell.favorites : [];
    const already = favorites.some((f) => String(f.user_id) === userId);

    let action = "";
    if (already) {
      // remove
      favorites = favorites.filter((f) => String(f.user_id) !== userId);
      action = "unfavorite";
    } else {
      // add
      favorites.push({
        user_id: userId,
        username,
        at: new Date().toISOString(),
      });
      action = "favorite";
    }

    const favorites_count = favorites.length;

    // update spell
    const { data: updated, error: updateError } = await supabase
      .from(SPELL_TABLE)
      .update({ favorites, favorites_count })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({
      success: true,
      action,
      favorites_count,
      spell: updated,
    });
  } catch (err) {
    console.error("❌ toggleFavoriteIgniteSpell Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
