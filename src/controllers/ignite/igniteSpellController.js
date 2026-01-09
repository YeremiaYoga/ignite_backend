// controllers/ignite/igniteSpellController.js
import supabase from "../../utils/db.js";

const SPELL_TABLE = "foundry_spells";

const RATING_VALUES = ["S", "A", "B", "C", "D", "F"];
const RATING_SCORES = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

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

  return { avgLetter, avgScore: avgFloor, count };
}

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
    if (Array.isArray(v)) v.forEach((d) => out.add(String(d).toLowerCase()));
    else out.add(String(v).toLowerCase());
  }

  const parts = spell.raw_data?.system?.damage?.parts;
  if (Array.isArray(parts)) {
    parts.forEach((p) => {
      if (Array.isArray(p) && p[1]) out.add(String(p[1]).toLowerCase());
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
    raw.forEach((c) => c && result.push(cap(String(c))));
  } else if (typeof raw === "string") {
    raw
      .split(/[;,/]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((c) => result.push(cap(c)));
  } else if (typeof raw === "object") {
    Object.keys(raw).forEach((k) => raw[k] && result.push(cap(k)));
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

    return hasSize ? "Area" : "Point";
  }

  if (typeof range === "string") {
    const raw = range.toLowerCase();
    if (
      raw.includes("cone") ||
      raw.includes("line") ||
      raw.includes("sphere") ||
      raw.includes("cube") ||
      raw.includes("cylinder")
    )
      return "Area";
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
    )
      return "Area";
    if (units.includes("special")) return "Special";
    if (units) return "Point";
  }

  return "";
}

function getDurationSeconds(spell) {
  const duration =
    spell.duration ||
    spell.format_data?.duration ||
    spell.raw_data?.system?.duration;

  if (!duration || typeof duration !== "object") return null;

  const units = String(duration.units || duration.unit || "").toLowerCase();
  const valueRaw = duration.value ?? 0;
  const value = Number(valueRaw) || 0;

  if (units === "inst" || units === "instant" || units === "instantaneous")
    return 0;
  if (units === "perm" || units === "permanent") return -1;
  if (units === "spec" || units === "special") return -2;

  switch (units) {
    case "turn":
    case "turns":
      return value * 1;
    case "round":
    case "rounds":
      return value * 6;
    case "minute":
    case "minutes":
      return value * 60 * 6;
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

function getRangeInfo(spell) {
  const range =
    spell.range || spell.format_data?.range || spell.raw_data?.system?.range;

  if (!range) return { type: "other", feet: null };

  if (typeof range === "string") {
    const raw = range.toLowerCase();
    if (raw.includes("self")) return { type: "self", feet: null };
    if (raw.includes("touch")) return { type: "touch", feet: null };
    const match = raw.match(/(\d+)\s*(ft|feet|foot)?/);
    if (match) return { type: "numeric", feet: Number(match[1]) || 0 };
    return { type: "other", feet: null };
  }

  if (typeof range === "object") {
    const units = String(range.units || range.unit || "").toLowerCase();
    const value = Number(range.value ?? 0) || 0;

    if (units === "self") return { type: "self", feet: null };
    if (units === "touch") return { type: "touch", feet: null };

    if (!units || !value) return { type: "other", feet: null };

    let feet = value;
    if (units === "mi" || units === "mile" || units === "miles")
      feet = value * 5280;

    return { type: "numeric", feet };
  }

  return { type: "other", feet: null };
}

// ======================================================
// ✅ Tri-state generic matcher (case-insensitive + number-safe)
// - itemValues: array of values from spell (string/number)
// - onlyList/blacklistList: array from query (string/number)
// ======================================================
function triListPass(itemValues, onlyList = [], blacklistList = []) {
  const vals = (Array.isArray(itemValues) ? itemValues : [])
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);

  const only = (Array.isArray(onlyList) ? onlyList : [])
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);

  const black = (Array.isArray(blacklistList) ? blacklistList : [])
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);

  // blacklist always applied
  if (black.length) {
    const hitBlack = vals.some((v) => black.includes(v));
    if (hitBlack) return false;
  }

  // ONLY mode: if any only selected, must match at least one
  if (only.length) {
    const hitOnly = vals.some((v) => only.includes(v));
    if (!hitOnly) return false;
  }

  return true;
}

// tri-state for boolean property: 0(off) 1(ONLY true) 2(BLACKLIST true)
function triPropPass(hasProp, mode = 0) {
  const m = Number(mode || 0);
  if (m === 0) return true;
  if (m === 1) return !!hasProp;
  if (m === 2) return !hasProp;
  return true;
}

export const getIgniteSpells = async (req, res) => {
  try {
    const {
      name,
      search,

      minRating,
      maxRating,
      ratingLetter,
      ratingLetters,

      favoritesOnly,

      // legacy params (still supported)
      levels,
      ranges,
      classes,
      castTimes,
      damageTypes,
      schools,
      ritual,
      concentration,

      // numeric filters
      minDurationSec,
      maxDurationSec,
      durationFlags,
      minRange,
      maxRange,
      rangeFlags,

      // homebrew include/only
      homebrews,
      homebrewOnly,

      // tri-state params
      classesOnly,
      classesBlacklist,
      levelsOnly,
      levelsBlacklist,
      castTimeOnly,
      castTimeBlacklist,
      damageTypeOnly,
      damageTypeBlacklist,
      schoolOnly,
      schoolBlacklist,
      ritualMode,
      concentrationMode,

      sortBy = "name",
      sortDir = "asc",
    } = req.query;

    const userId = req.user?.id ? String(req.user.id) : null;

    // ========= legacy lists =========
    const legacyClassList = parseListParam(classes) || [];
    const legacyLevelList = parseListParam(levels) || [];
    const legacyCastTimeList = (parseListParam(castTimes) || []).map((v) =>
      String(v).toLowerCase()
    );
    const legacyDamageTypeList = (parseListParam(damageTypes) || []).map((v) =>
      String(v).toLowerCase()
    );
    const legacySchoolList = (parseListParam(schools) || []).map((v) =>
      String(v).toLowerCase()
    );

    // ========= tri lists (fallback to legacy ONLY lists) =========
    const classOnlyList = (parseListParam(classesOnly) || legacyClassList).map(
      (v) => cap(String(v))
    );
    const classBlackList = (parseListParam(classesBlacklist) || []).map((v) =>
      cap(String(v))
    );

    const levelOnlyList = parseListParam(levelsOnly) || legacyLevelList; // keep raw (we will string it)
    const levelBlackList = parseListParam(levelsBlacklist) || [];

    const castOnlyList = parseListParam(castTimeOnly) || legacyCastTimeList;
    const castBlackList = parseListParam(castTimeBlacklist) || [];

    const dmgOnlyList = parseListParam(damageTypeOnly) || legacyDamageTypeList;
    const dmgBlackList = parseListParam(damageTypeBlacklist) || [];

    const schOnlyList = parseListParam(schoolOnly) || legacySchoolList;
    const schBlackList = parseListParam(schoolBlacklist) || [];

    // ========= tri flags with legacy bool =========
    const ritualLegacy =
      typeof ritual !== "undefined" && String(ritual).toLowerCase() === "true";
    const concentrationLegacy =
      typeof concentration !== "undefined" &&
      String(concentration).toLowerCase() === "true";

    const ritualModeNum =
      typeof ritualMode !== "undefined"
        ? Number(ritualMode)
        : ritualLegacy
        ? 1
        : 0;

    const concentrationModeNum =
      typeof concentrationMode !== "undefined"
        ? Number(concentrationMode)
        : concentrationLegacy
        ? 1
        : 0;

    // ========= favorites =========
    const favoritesOnlyFlag =
      typeof favoritesOnly !== "undefined" &&
      String(favoritesOnly).toLowerCase() === "true";

    // ========= rating =========
    const ratingLettersList = parseListParam(ratingLetters);

    // ========= duration numeric =========
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

    // ========= range numeric =========
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

    // ========= homebrew include/only =========
    const hbInclude = (parseListParam(homebrews) || []).map((v) =>
      String(v).toLowerCase().trim()
    );
    const hbOnly = (parseListParam(homebrewOnly) || []).map((v) =>
      String(v).toLowerCase().trim()
    );

    // ========= supabase query =========
    let query = supabase.from(SPELL_TABLE).select("*");

    const nameQuery = name || search;
    if (nameQuery) query = query.ilike("name", `%${nameQuery}%`);

    // rating filters DB-side
    const minRScore = Number(minRating);
    const maxRScore = Number(maxRating);
    if (!isNaN(minRScore)) query = query.gte("ratings_score", minRScore);
    if (!isNaN(maxRScore)) query = query.lte("ratings_score", maxRScore);

    if (ratingLettersList && ratingLettersList.length > 0) {
      const scores = ratingLettersList
        .map((rl) => normalizeRating(rl))
        .filter(Boolean)
        .map((rl) => RATING_SCORES[rl]);
      if (scores.length > 0) query = query.in("ratings_score", scores);
    } else if (ratingLetter) {
      const normalized = normalizeRating(ratingLetter);
      if (normalized)
        query = query.eq("ratings_score", RATING_SCORES[normalized]);
    }

    // sort
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

    const { data, error } = await query;
    if (error) throw error;

    let spells = (data || []).map((row) => {
      const favorites = Array.isArray(row.favorites) ? row.favorites : [];
      const ratings = Array.isArray(row.ratings) ? row.ratings : [];

      const is_favorite =
        userId && favorites.some((f) => String(f.user_id) === userId);

      const { avgLetter, avgScore, count } = computeAverageRating(ratings);

      let my_rating = null;
      if (userId) {
        const found = ratings.find((r) => String(r.user_id) === userId);
        if (found?.rating)
          my_rating = { rating: String(found.rating).toUpperCase() };
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

    function matchHomebrewRule(spell) {
      const hasInclude = hbInclude.length > 0;
      const hasOnly = hbOnly.length > 0;

      // kalau join dimatikan, "homebrew" gak ada -> amanin
      const hb = spell.homebrew || null;

      // kamu mau null-kan dulu homebrew_id, jadi ini biasanya false
      const isHomebrew = !!spell.homebrew_id;

      const hbName = hb ? String(hb.name || "").toLowerCase() : "";
      const hbCode = hb ? String(hb.code || "").toLowerCase() : "";

      if (!hasInclude && !hasOnly) return !isHomebrew;

      if (hasOnly) {
        if (!isHomebrew) return false;
        return hbOnly.some((v) => hbCode === v || hbName.includes(v));
      }

      if (!isHomebrew) return true;
      return hbInclude.some((v) => hbCode === v || hbName.includes(v));
    }

    const rangeListLegacy = parseListParam(ranges); 
    spells = spells.filter((spell) => {
      if (!matchHomebrewRule(spell)) return false;

      const sClasses = getSpellClasses(spell); 
      if (!triListPass(sClasses, classOnlyList, classBlackList)) return false;

      const lvlNum = Number(spell.level ?? 0);
      const lvlKeys =
        lvlNum === 0 ? ["0", "cantrips", "cantrip"] : [String(lvlNum)];
      if (!triListPass(lvlKeys, levelOnlyList, levelBlackList)) return false;

      const ctKey = getActivationFilterKey(spell); 
      if (!triListPass([ctKey], castOnlyList, castBlackList)) return false;

      if (rangeListLegacy && rangeListLegacy.length > 0) {
        const rKey = getRangeFilterKey(spell);
        if (!rKey || !rangeListLegacy.includes(rKey)) return false;
      }

      const dTypes = getDamageTypes(spell);
      if (!triListPass(dTypes, dmgOnlyList, dmgBlackList)) return false;

      const sc = String(getSpellSchoolCode(spell) || "").toLowerCase();
      if (!triListPass([sc], schOnlyList, schBlackList)) return false;

      const isRitual = hasProperty(spell, "ritual");
      const isConc = hasProperty(spell, "concentration");
      if (!triPropPass(isRitual, ritualModeNum)) return false;
      if (!triPropPass(isConc, concentrationModeNum)) return false;

      return true;
    });

    if (minDur != null || maxDur != null || durationFlagSet.size > 0) {
      spells = spells.filter((spell) => {
        const sec = getDurationSeconds(spell);
        if (sec == null) return false;

        const flag = getDurationFlagFromSeconds(sec);
        if (flag) {
          if (durationFlagSet.size === 0) return false;
          return durationFlagSet.has(flag);
        }

        if (minDur != null && sec < minDur) return false;
        if (maxDur != null && sec > maxDur) return false;
        return true;
      });
    }

    if (minR != null || maxR != null || rangeFlagSet.size > 0) {
      spells = spells.filter((spell) => {
        const info = getRangeInfo(spell);

        if (info.type === "self") {
          if (rangeFlagSet.size === 0) return true;
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

        if (minR != null || maxR != null) return false;
        if (rangeFlagSet.size > 0) return false;
        return true;
      });
    }

    if (favoritesOnlyFlag) {
      if (!userId) spells = [];
      else spells = spells.filter((s) => s.is_favorite === true);
    }

    return res.json({ success: true, count: spells.length, spells });
  } catch (err) {
    console.error("❌ getIgniteSpells Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

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

    if (idx >= 0) ratings[idx] = ratingObj;
    else ratings.push(ratingObj);

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
