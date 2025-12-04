// controllers/igniteSpellController.js
import supabase from "../../utils/db.js";

const SPELL_TABLE = "foundry_spells";

// ========================= RATING HELPERS =========================
const RATING_VALUES = ["S", "A", "B", "C", "D", "F"];
const RATING_SCORES = {
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
};

function normalizeRating(val) {
  if (!val) return null;
  const upper = String(val).trim().toUpperCase();
  return RATING_VALUES.includes(upper) ? upper : null;
}

function computeAverageRating(ratings) {
  const arr = Array.isArray(ratings) ? ratings : [];
  if (!arr.length) return { avgLetter: null, avgScore: null, count: 0 };

  let sum = 0;
  let count = 0;

  for (const r of arr) {
    const letter = normalizeRating(r.rating);
    if (!letter) continue;

    sum += RATING_SCORES[letter] || 0;
    count++;
  }

  if (!count) return { avgLetter: null, avgScore: null, count: 0 };

  const avgRaw = sum / count;
  const avgFloor = Math.floor(avgRaw); 

  const avgLetter =
    Object.entries(RATING_SCORES).find(
      ([, score]) => score === avgFloor
    )?.[0] || null;

  return {
    avgLetter,
    avgScore: avgFloor, 
    count,
  };
}

// ========================= GET SPELLS =========================
export const getIgniteSpells = async (req, res) => {
  try {
    const { search, school, level } = req.query;

    const userId = req.user?.id || null;
    console.log(userId);

    let query = supabase.from(SPELL_TABLE).select("*");

    if (search) {
      const like = `%${search.toLowerCase()}%`;
      query = query.ilike("name", like);
    }

    if (school) {
      query = query.ilike("school", school);
    }

    if (level !== undefined) {
      const lvl = Number(level);
      if (!isNaN(lvl)) query = query.eq("level", lvl);
    }

    const { data, error } = await query;
    if (error) throw error;

    const spells = (data || []).map((row) => {
      // ===== FAVORITES =====
      const favorites = Array.isArray(row.favorites) ? row.favorites : [];
      const favorites_count =
        typeof row.favorites_count === "number"
          ? row.favorites_count
          : favorites.length;

      const is_favorite =
        userId != null
          ? favorites.some((f) => String(f.user_id) === userId)
          : false;

      // ===== RATINGS =====
      const ratings = Array.isArray(row.ratings) ? row.ratings : [];

      let my_rating = null;
      if (userId != null) {
        console.log(userId);
        const found = ratings.find((r) => String(r.user_id) === userId);
        if (found && found.rating) {
          my_rating = { rating: String(found.rating).toUpperCase() };
        }
      }

    
      const { avgLetter, avgScore, count } = computeAverageRating(ratings);

      const rating_average_score =
        typeof avgScore === "number" ? avgScore : null; 
      const rating_average_letter = avgLetter || "";
      const rating_total = count;

      return {
        __type: "spell",
        __table: SPELL_TABLE,
        __global_id: `spell-${row.id}`,

        favorites_count,
        is_favorite,

        my_rating,
        rating_average_score,
        rating_average_letter,
        rating_total,

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

// ========================= FAVORITE SPELL =========================
export const toggleFavoriteIgniteSpell = async (req, res) => {
  try {
    const { id } = req.params;

    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const { data: spell, error: fetchError } = await supabase
      .from(SPELL_TABLE)
      .select("favorites")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!spell) return res.status(404).json({ error: "Spell not found" });

    let favorites = Array.isArray(spell.favorites) ? spell.favorites : [];
    const exists = favorites.some((f) => String(f.user_id) === String(user.id));

    if (exists) {
      favorites = favorites.filter(
        (f) => String(f.user_id) !== String(user.id)
      );
    } else {
      favorites.push({
        user_id: String(user.id),
        username: user.username || user.email || "Unknown",
        at: new Date().toISOString(),
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from(SPELL_TABLE)
      .update({
        favorites,
        favorites_count: favorites.length,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({
      success: true,
      action: exists ? "unfavorite" : "favorite",
      favorites_count: favorites.length,
      spell: updated,
    });
  } catch (err) {
    console.error("❌ toggleFavoriteIgniteSpell Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ========================= RATE SPELL (ADD / UPDATE / DELETE) =========================
export const rateIgniteSpell = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const normalized = normalizeRating(rating); 

    const { data: spell, error: fetchError } = await supabase
      .from(SPELL_TABLE)
      .select("ratings")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!spell) return res.status(404).json({ error: "Spell not found" });

    let ratings = Array.isArray(spell.ratings) ? spell.ratings : [];
    const idx = ratings.findIndex((r) => String(r.user_id) === String(user.id));

    // ========================= DELETE RATING (NONE) =========================
    if (!normalized) {
      if (idx >= 0) ratings.splice(idx, 1);

      const { avgLetter, avgScore, count } = computeAverageRating(ratings);

      const { data: updated, error: delError } = await supabase
        .from(SPELL_TABLE)
        .update({
          ratings,
          ratings_score: avgScore, 
        })
        .eq("id", id)
        .select()
        .single();

      if (delError) throw delError;

      return res.json({
        success: true,
        action: "delete",
        rating_average_letter: avgLetter || "",
        rating_average_score: avgScore,
        rating_total: count,
        spell: updated,
      });
    }

    // ========================= ADD OR UPDATE RATING =========================
    const now = new Date().toISOString();

    const ratingObj = {
      user_id: String(user.id),
      username: user.username || user.email || "Unknown",
      rating: normalized,
      score: RATING_SCORES[normalized],
      at: now,
    };

    if (idx >= 0) {
      ratings[idx] = ratingObj; 
    } else {
      ratings.push(ratingObj); 
    }

    const { avgLetter, avgScore, count } = computeAverageRating(ratings);

    const { data: updated, error: updateError } = await supabase
      .from(SPELL_TABLE)
      .update({
        ratings,
        ratings_score: avgScore, 
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({
      success: true,
      action: idx >= 0 ? "update" : "add",
      my_rating: ratingObj,
      rating_average_letter: avgLetter || "",
      rating_average_score: avgScore,
      rating_total: count,
      spell: updated,
    });
  } catch (err) {
    console.error("❌ rateIgniteSpell Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
