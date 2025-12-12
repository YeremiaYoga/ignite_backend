// controllers/ignite/igniteSpellController.js
import supabase from "../../utils/db.js";

const SPELL_TABLE = "foundry_spells";

const RATING_VALUES = ["S", "A", "B", "C", "D", "F"];
const RATING_SCORES = {
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
};

const SCHOOL_LABEL_BY_CODE = {
  abj: "Abjuration",
  con: "Conjuration",
  div: "Divination",
  enc: "Enchantment",
  evo: "Evocation",
  ill: "Illusion",
  nec: "Necromancy",
  trs: "Transmutation",
};

const SCHOOL_CODE_BY_RAW = {
  abj: "abj",
  abjuration: "abj",

  con: "con",
  conj: "con",
  conjuration: "con",

  div: "div",
  divination: "div",

  enc: "enc",
  ench: "enc",
  enchantment: "enc",

  evo: "evo",
  evocation: "evo",

  ill: "ill",
  illusion: "ill",

  nec: "nec",
  necromancy: "nec",

  trs: "trs",
  transmutation: "trs",
};

// ========================= HELPERS =========================

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

// "1,2,3" / ["1","2"] → ["1","2","3"]
function parseListParam(param) {
  if (!param) return null;
  if (Array.isArray(param)) {
    return param.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  return String(param)
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

// === Spell helpers (dipindah dari frontend ke backend) ===

function cap(str) {
  if (!str) return "";
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

function getSpellSchoolCode(spell) {
  const raw =
    spell.school ||
    spell.school_name ||
    spell.format_data?.school ||
    spell.raw_data?.system?.school;

  if (!raw) return "";

  const lower = String(raw).toLowerCase().trim();
  return SCHOOL_CODE_BY_RAW[lower] || lower;
}

function hasProperty(spell, target) {
  let props = spell.properties;

  if (typeof props === "string") {
    try {
      props = JSON.parse(props);
    } catch {
      return false;
    }
  }

  if (!Array.isArray(props)) return false;

  const key = String(target).toLowerCase().trim();

  return props.some((p) => String(p).toLowerCase().trim() === key);
}

function getDamageTypes(spell) {
  const out = new Set();

  if (spell.damage_type) out.add(String(spell.damage_type).toLowerCase());

  if (spell.format_data?.damageType) {
    const v = spell.format_data.damageType;
    if (Array.isArray(v)) {
      v.forEach((d) => out.add(String(d).toLowerCase()));
    } else {
      out.add(String(v).toLowerCase());
    }
  }

  const parts = spell.raw_data?.system?.damage?.parts;
  if (Array.isArray(parts)) {
    parts.forEach((p) => {
      if (Array.isArray(p) && p[1]) {
        out.add(String(p[1]).toLowerCase());
      }
    });
  }

  return Array.from(out);
}

function getSpellClasses(spell) {
  const raw =
    spell.classes ||
    spell.class_list ||
    spell.format_data?.classes ||
    spell.raw_data?.classes ||
    spell.raw_data?.system?.classes ||
    spell.raw_data?.flags?.dnd5e?.spell?.classes;

  const result = [];

  if (!raw) return result;

  if (Array.isArray(raw)) {
    raw.forEach((c) => {
      if (!c) return;
      result.push(cap(String(c)));
    });
  } else if (typeof raw === "string") {
    raw
      .split(/[;,/]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((c) => result.push(cap(c)));
  } else if (typeof raw === "object") {
    Object.keys(raw).forEach((k) => {
      if (raw[k]) result.push(cap(k));
    });
  }

  return Array.from(new Set(result));
}

function getActivationFilterKey(spell) {
  const activation =
    spell.activation ||
    spell.format_data?.activation ||
    spell.raw_data?.system?.activation;

  if (!activation || typeof activation !== "object") return "";

  const type = activation.type;
  if (!type) return "";

  const map = {
    action: "action",
    bonus: "bonus action",
    "bonus action": "bonus action",
    reaction: "reaction",
    minute: "minute",
    hour: "hour",
    round: "round",
    special: "special",
  };

  const lower = String(type).toLowerCase();
  return map[lower] || lower;
}

function getRangeFilterKey(spell) {
  const range =
    spell.range || spell.format_data?.range || spell.raw_data?.system?.range;

  const template =
    spell.template ||
    spell.format_data?.template ||
    spell.raw_data?.system?.target?.template;

  if (!range && !template) return "";

  if (typeof range === "object" && range) {
    const units = (range.units || range.unit || "").toLowerCase();
    if (units === "self") return "Self";
    if (units === "touch") return "Touch";
  }

  if (typeof range === "string") {
    const raw = range.toLowerCase();
    if (raw.includes("self")) return "Self";
    if (raw.includes("touch")) return "Touch";
  }

  if (template && typeof template === "object") {
    const size = template.size ?? template.value;
    const hasSize =
      size != null &&
      size !== "" &&
      (Number.isNaN(Number(size)) || Number(size) !== 0);

    if (hasSize) {
      return "Area";
    }

    return "Point";
  }

  if (typeof range === "string") {
    const raw = range.toLowerCase();
    if (
      raw.includes("cone") ||
      raw.includes("line") ||
      raw.includes("sphere") ||
      raw.includes("cube") ||
      raw.includes("cylinder")
    ) {
      return "Area";
    }
    if (raw.includes("special")) return "Special";
    return "Point";
  }

  if (typeof range === "object" && range) {
    const units = (range.units || range.unit || "").toLowerCase();

    if (
      units.includes("cone") ||
      units.includes("line") ||
      units.includes("sphere") ||
      units.includes("cube") ||
      units.includes("cylinder")
    ) {
      return "Area";
    }
    if (units.includes("special")) return "Special";

    if (units) return "Point";
  }

  return "";
}

// ===== Duration / Range numeric helpers (buat slider backend) =====

function getDurationSeconds(spell) {
  const duration =
    spell.duration ||
    spell.format_data?.duration ||
    spell.raw_data?.system?.duration;

  if (!duration || typeof duration !== "object") return null;

  const units = String(duration.units || duration.unit || "").toLowerCase();
  const valueRaw = duration.value ?? 0;
  const value = Number(valueRaw) || 0;

  // special flags
  if (units === "inst" || units === "instant" || units === "instantaneous") {
    return 0; // Instantaneous
  }
  if (units === "perm" || units === "permanent") {
    return -1; // Permanent
  }
  if (units === "spec" || units === "special") {
    return -2; // Special
  }

  switch (units) {
    case "turn":
    case "turns":
      return value * 1; // Turn = 1 second
    case "round":
    case "rounds":
      return value * 6; // Round = 6 seconds
    case "minute":
    case "minutes":
      return value * 60 * 6; // 60 round * 6s
    case "hour":
    case "hours":
      return value * 3600;
    case "day":
    case "days":
      return value * 86400;
    case "month":
    case "months":
      return value * 2592000;
    case "year":
    case "years":
      return value * 31536000;
    default:
      return null;
  }
}

function getDurationFlagFromSeconds(sec) {
  if (sec === 0) return "inst";
  if (sec === -1) return "perm";
  if (sec === -2) return "special";
  return null;
}

// Range numeric: feet + type (self/touch/numeric/other)
function getRangeInfo(spell) {
  const range =
    spell.range || spell.format_data?.range || spell.raw_data?.system?.range;

  if (!range) return { type: "other", feet: null };

  // string
  if (typeof range === "string") {
    const raw = range.toLowerCase();
    if (raw.includes("self")) return { type: "self", feet: null };
    if (raw.includes("touch")) return { type: "touch", feet: null };

    const match = raw.match(/(\d+)\s*(ft|feet|foot)?/);
    if (match) {
      const v = Number(match[1]) || 0;
      return { type: "numeric", feet: v };
    }
    return { type: "other", feet: null };
  }

  // object
  if (typeof range === "object") {
    const units = String(range.units || range.unit || "").toLowerCase();
    const value = Number(range.value ?? 0) || 0;

    if (units === "self") return { type: "self", feet: null };
    if (units === "touch") return { type: "touch", feet: null };

    if (!units || !value) {
      return { type: "other", feet: null };
    }

    let feet = value;
    if (units === "ft" || units === "feet" || units === "foot") {
      feet = value;
    } else if (units === "mi" || units === "mile" || units === "miles") {
      feet = value * 5280;
    } else {
      // fallback: treat as feet
      feet = value;
    }

    return { type: "numeric", feet };
  }

  return { type: "other", feet: null };
}

// ========================= CONTROLLER =========================

export const getIgniteSpells = async (req, res) => {
  try {
    const {
      // basic search
      name,
      search,

      // simple single values
      level,
      range,
      duration,

      // rating filters
      minRating,
      maxRating,
      ratingLetter,
      ratingLetters,

      // favorites-only
      favoritesOnly,

      // multiple filters (comma separated)
      levels, // ex: "0,1,2"
      ranges, // ex: "Self,Touch"
      durations, // ex: "Instantaneous,Concentration"
      classes, // ex: "Wizard,Cleric"
      castTimes, // ex: "action,bonus action"
      damageTypes, // ex: "fire,necrotic"
      schools, // ex: "abj,evo"

      // boolean flags (string "true"/"false")
      ritual,
      concentration,

      // numeric duration & range (dari slider)
      minDurationSec,
      maxDurationSec,
      durationFlags, // "inst,perm,special"

      minRange,
      maxRange,
      rangeFlags, // "self,touch"

      // sorting
      sortBy = "name",
      sortDir = "asc",
    } = req.query;

    const userId = req.user?.id ? String(req.user.id) : null;

    // ========= PARSE PARAMS =========

    const levelList = parseListParam(levels);
    const rangeList = parseListParam(ranges);
    const durationList = parseListParam(durations); // kalau mau dipakai tambahan
    const classList = parseListParam(classes);
    const castTimeList = parseListParam(castTimes)?.map((v) =>
      String(v).toLowerCase()
    );
    const damageTypeList = parseListParam(damageTypes)?.map((v) =>
      String(v).toLowerCase()
    );
    const schoolList = parseListParam(schools)?.map((v) =>
      String(v).toLowerCase()
    );

    const ratingLettersList = parseListParam(ratingLetters);

    const ritualOnly =
      typeof ritual !== "undefined" && String(ritual).toLowerCase() === "true";

    const concentrationOnly =
      typeof concentration !== "undefined" &&
      String(concentration).toLowerCase() === "true";

    const favoritesOnlyFlag =
      typeof favoritesOnly !== "undefined" &&
      String(favoritesOnly).toLowerCase() === "true";

    // duration slider
    const minDur =
      typeof minDurationSec !== "undefined" && minDurationSec !== ""
        ? Number(minDurationSec)
        : null;
    const maxDur =
      typeof maxDurationSec !== "undefined" && maxDurationSec !== ""
        ? Number(maxDurationSec)
        : null;

    const durationFlagSet = new Set(
      typeof durationFlags === "string" && durationFlags.length
        ? durationFlags
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : []
    );

    // range slider
    const minR =
      typeof minRange !== "undefined" && minRange !== ""
        ? Number(minRange)
        : null;
    const maxR =
      typeof maxRange !== "undefined" && maxRange !== ""
        ? Number(maxRange)
        : null;

    const rangeFlagSet = new Set(
      typeof rangeFlags === "string" && rangeFlags.length
        ? rangeFlags
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : []
    );

    let query = supabase.from(SPELL_TABLE).select("*");

    // =========================
    // NAME / SEARCH (DB level)
    // =========================
    const nameQuery = name || search;
    if (nameQuery) {
      query = query.ilike("name", `%${nameQuery}%`);
    }

    // =========================
    // LEVEL: single / multiple
    // =========================
    if (levelList && levelList.length > 0) {
      const nums = levelList.map((v) => Number(v)).filter((n) => !isNaN(n));
      if (nums.length > 0) {
        query = query.in("level", nums);
      }
    } else if (level !== undefined && level !== "") {
      const lvl = Number(level);
      if (!isNaN(lvl)) {
        query = query.eq("level", lvl);
      }
    }

    // =========================
    // RANGE (simple DB filter)
    // =========================
    if (range) {
      query = query.ilike("range", `%${range}%`);
    }

    // =========================
    // DURATION (simple DB filter)
    // =========================
    if (duration) {
      query = query.ilike("duration", `%${duration}%`);
    }

    // =========================
    // RATING SCORE (min / max) – DB
    // =========================
    const minRScore = Number(minRating);
    const maxRScore = Number(maxRating);

    if (!isNaN(minRScore)) query = query.gte("ratings_score", minRScore);
    if (!isNaN(maxRScore)) query = query.lte("ratings_score", maxRScore);

    // =========================
    // RATING LETTER: single / multiple – DB
    // =========================
    if (ratingLettersList && ratingLettersList.length > 0) {
      const scores = ratingLettersList
        .map((rl) => normalizeRating(rl))
        .filter(Boolean)
        .map((rl) => RATING_SCORES[rl]);
      if (scores.length > 0) {
        query = query.in("ratings_score", scores);
      }
    } else if (ratingLetter) {
      const normalized = normalizeRating(ratingLetter);
      if (normalized) {
        query = query.eq("ratings_score", RATING_SCORES[normalized]);
      }
    }

    // =========================
    // SORTING – DB
    // =========================
    let sortField = "name";

    switch (sortBy) {
      case "level":
        sortField = "level";
        break;
      case "rating":
        sortField = "ratings_score";
        break;
      case "favorites":
        sortField = "favorites_count";
        break;
      case "name":
      default:
        sortField = "name";
        break;
    }

    const ascending = String(sortDir).toLowerCase() !== "desc";
    query = query.order(sortField, { ascending });

    // =========================
    // FETCH FROM DB
    // =========================
    const { data, error } = await query;
    if (error) throw error;

    // =========================
    // MAP FAVORITES & RATING
    // =========================
    let spells = (data || []).map((row) => {
      const favorites = Array.isArray(row.favorites) ? row.favorites : [];
      const ratings = Array.isArray(row.ratings) ? row.ratings : [];

      const is_favorite =
        userId && favorites.some((f) => String(f.user_id) === userId);

      const { avgLetter, avgScore, count } = computeAverageRating(ratings);

      let my_rating = null;
      if (userId) {
        const found = ratings.find((r) => String(r.user_id) === userId);
        if (found?.rating) {
          my_rating = { rating: String(found.rating).toUpperCase() };
        }
      }

      return {
        __type: "spell",
        __table: SPELL_TABLE,
        __global_id: `spell-${row.id}`,

        favorites_count: favorites.length,
        is_favorite,

        my_rating,
        rating_average_letter: avgLetter || "",
        rating_average_score: typeof avgScore === "number" ? avgScore : null,
        rating_total: count,

        ...row,
      };
    });

    // =========================
    // COMPLEX FILTERS – JS side (masih di backend)
    // =========================
    spells = spells.filter((spell) => {
      // Classes
      if (classList && classList.length > 0) {
        const sClasses = getSpellClasses(spell);
        const matchClass = sClasses.some((cls) => classList.includes(cls));
        if (!matchClass) return false;
      }

      // Cast time
      if (castTimeList && castTimeList.length > 0) {
        const key = getActivationFilterKey(spell); // "action", "bonus action", ...
        if (!key || !castTimeList.includes(key)) return false;
      }

      // Range kategori (Self / Touch / Point / Area / Special)
      if (rangeList && rangeList.length > 0) {
        const rKey = getRangeFilterKey(spell);
        if (!rKey || !rangeList.includes(rKey)) return false;
      }

      // Damage type
      if (damageTypeList && damageTypeList.length > 0) {
        const types = getDamageTypes(spell); // lowercase
        const matchDamage = types.some((t) => damageTypeList.includes(t));
        if (!matchDamage) return false;
      }

      // School
      if (schoolList && schoolList.length > 0) {
        const code = getSpellSchoolCode(spell);
        if (!code || !schoolList.includes(code.toLowerCase())) {
          return false;
        }
      }

      // Ritual
      if (ritualOnly && !hasProperty(spell, "ritual")) {
        return false;
      }

      // Concentration
      if (concentrationOnly && !hasProperty(spell, "concentration")) {
        return false;
      }

      return true;
    });

    // =========================
    // DURATION NUMERIC – JS side
    // =========================
    if (minDur != null || maxDur != null || durationFlagSet.size > 0) {
      spells = spells.filter((spell) => {
        const sec = getDurationSeconds(spell);
        if (sec == null) return false;

        const flag = getDurationFlagFromSeconds(sec);
        if (flag) {
          // inst / perm / special
          if (durationFlagSet.size === 0) {
            return false; // kalau tidak dipilih, skip
          }
          return durationFlagSet.has(flag);
        }

        // normal numeric duration
        if (minDur != null && sec < minDur) return false;
        if (maxDur != null && sec > maxDur) return false;
        return true;
      });
    }

    // =========================
    // RANGE NUMERIC – JS side
    // =========================
    if (minR != null || maxR != null || rangeFlagSet.size > 0) {
      spells = spells.filter((spell) => {
        const info = getRangeInfo(spell);

        if (info.type === "self") {
          if (rangeFlagSet.size === 0) return true; // tidak ada flag: jangan di-drop
          return rangeFlagSet.has("self");
        }

        if (info.type === "touch") {
          if (rangeFlagSet.size === 0) return true;
          return rangeFlagSet.has("touch");
        }

        if (info.type === "numeric") {
          if (info.feet == null) return false;
          if (minR != null && info.feet < minR) return false;
          if (maxR != null && info.feet > maxR) return false;
          return true;
        }

        // other types (no numeric)
        if (minR != null || maxR != null) return false;
        if (rangeFlagSet.size > 0) return false;
        return true;
      });
    }

    // =========================
    // FAVORITES ONLY – JS side
    // =========================
    if (favoritesOnlyFlag) {
      if (!userId) {
        spells = [];
      } else {
        spells = spells.filter((s) => s.is_favorite === true);
      }
    }

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

// ======================================================
// FAVORITE TOGGLE
// ======================================================
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

// ======================================================
// RATING SPELL
// ======================================================
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

    // Hapus rating kalau rating invalid / kosong
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
