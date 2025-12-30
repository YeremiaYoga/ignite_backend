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

// --------------------
// Helpers
// --------------------
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

// ✅ Tri-state matcher
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

  if (black.length) {
    const hitBlack = vals.some((v) => black.includes(v));
    if (hitBlack) return false;
  }

  if (only.length) {
    const hitOnly = vals.some((v) => only.includes(v));
    if (!hitOnly) return false;
  }

  return true;
}

function normalizeNullableKey(v) {
  if (v === null || v === undefined || v === "") return "__null__";
  return String(v).trim().toLowerCase();
}

function getArrayish(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [v];
    } catch {
      return [v];
    }
  }

  if (typeof v === "object") {
    return Object.entries(v)
      .filter(([, val]) => !!val)
      .map(([k]) => k);
  }

  return [];
}

/** ✅ FIX: properties ambil dari row.properties saja */
function getWeaponProperties(row) {
  const arr = getArrayish(row.properties);
  return arr.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
}

// FE kamu pakai bucket "null" kalau rarity kosong
function getRarityKey(row) {
  const raw =
    row.rarity ??
    row.rarity_name ??
    row.format_data?.system?.rarity ??
    row.raw_data?.system?.rarity ??
    "";

  const key = String(raw).trim().toLowerCase();
  return key || "null";
}

function getPriceCp(row) {
  const v = row.price ?? row.cost;
  const n = typeof v === "number" ? v : Number(v ?? NaN);
  return Number.isFinite(n) ? n : null;
}

// type_value di data kamu = "simpleM" (camelCase)
function getWeaponTypeValue(row) {
  const raw =
    row.type_value ??
    row.format_data?.system?.type?.value ??
    row.raw_data?.system?.type?.value;

  return String(raw ?? "").trim(); // keep case
}

function getWeaponBaseItem(row) {
  const raw =
    row.base_item ??
    row.format_data?.system?.type?.baseItem ??
    row.raw_data?.system?.type?.baseItem;

  return normalizeNullableKey(raw);
}

function getWeaponMastery(row) {
  const raw =
    row.mastery ??
    row.format_data?.system?.mastery ??
    row.raw_data?.system?.mastery;

  return String(raw ?? "").trim().toLowerCase();
}

function getTableByType(typeKey) {
  return (
    TABLES.find((t) => t.key === String(typeKey || "").toLowerCase()) || null
  );
}

// --------------------
// GET ITEMS (with filters + sorting)
// --------------------
export const getFoundryItems = async (req, res) => {
  try {
    const {
      // search
      type, // legacy single type
      search,
      name,

      // tri-state types/rarities
      typesOnly,
      typesBlacklist,
      raritiesOnly,
      raritiesBlacklist,

      // weapon tri-state
      weaponTypeOnly,
      weaponTypeBlacklist,
      baseWeaponOnly,
      baseWeaponBlacklist,
      masteryOnly,
      masteryBlacklist,
      propertiesOnly,
      propertiesBlacklist,

      // price
      priceMin,
      priceMax,
      priceIncludeInfinity,

      // favorites
      favoritesOnly,

      // ✅ sort
      sortBy = "name", // name|price|rarity|favorites
      sortDir = "asc", // asc|desc
    } = req.query;

    const userId = req.user?.id ? String(req.user.id) : null;

    // search
    const nameQuery = name || search;
    const like = nameQuery ? `%${String(nameQuery).toLowerCase()}%` : null;

    // legacy type
    const legacyType = type ? String(type).toLowerCase() : null;

    // parse tri lists
    const typesOnlyList =
      parseListParam(typesOnly) || (legacyType ? [legacyType] : []);
    const typesBlackList = parseListParam(typesBlacklist) || [];

    const rarOnlyList = parseListParam(raritiesOnly) || [];
    const rarBlackList = parseListParam(raritiesBlacklist) || [];

    const wTypeOnlyList = parseListParam(weaponTypeOnly) || [];
    const wTypeBlackList = parseListParam(weaponTypeBlacklist) || [];

    const baseOnlyList = (parseListParam(baseWeaponOnly) || []).map((v) => {
      const s = String(v).trim().toLowerCase();
      return s === "null" ? "__null__" : s;
    });
    const baseBlackList = (parseListParam(baseWeaponBlacklist) || []).map((v) => {
      const s = String(v).trim().toLowerCase();
      return s === "null" ? "__null__" : s;
    });

    const masteryOnlyList = (parseListParam(masteryOnly) || []).map((v) =>
      String(v).trim().toLowerCase()
    );
    const masteryBlackList = (parseListParam(masteryBlacklist) || []).map((v) =>
      String(v).trim().toLowerCase()
    );

    const propOnlyList = (parseListParam(propertiesOnly) || []).map((v) =>
      String(v).trim().toLowerCase()
    );
    const propBlackList = (parseListParam(propertiesBlacklist) || []).map((v) =>
      String(v).trim().toLowerCase()
    );

    // price
    const minP =
      typeof priceMin !== "undefined" && priceMin !== "" ? Number(priceMin) : null;

    const maxP =
      typeof priceMax !== "undefined" && priceMax !== "" ? Number(priceMax) : null;

    const includeInf =
      typeof priceIncludeInfinity !== "undefined"
        ? String(priceIncludeInfinity).toLowerCase() === "true"
        : true;

    // favorites
    const favoritesOnlyFlag =
      typeof favoritesOnly !== "undefined" &&
      String(favoritesOnly).toLowerCase() === "true";

    // choose tables
    let usedTables = TABLES;

    if (typesOnlyList.length) {
      const only = typesOnlyList.map((x) => String(x).toLowerCase());
      usedTables = TABLES.filter((t) => only.includes(t.key));
    } else if (legacyType) {
      usedTables = TABLES.filter((t) => t.key === legacyType);
    }

    if (typesBlackList.length) {
      const black = typesBlackList.map((x) => String(x).toLowerCase());
      usedTables = usedTables.filter((t) => !black.includes(t.key));
    }

    if (!usedTables.length) {
      return res.json({ success: true, count: 0, items: [] });
    }

    // fetch
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
          userId != null ? favorites.some((f) => String(f.user_id) === userId) : false;

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

    // filter
    items = items.filter((it) => {
      if (!triListPass([it.__type], typesOnlyList, typesBlackList)) return false;

      const rarityKey = getRarityKey(it);
      if (!triListPass([rarityKey], rarOnlyList, rarBlackList)) return false;

      const cp = getPriceCp(it);
      if (minP != null) {
        if (cp == null) return false;
        if (cp < minP) return false;
      }
      if (!includeInf && maxP != null) {
        if (cp == null) return false;
        if (cp > maxP) return false;
      }

      if (favoritesOnlyFlag) {
        if (!userId) return false;
        if (!it.is_favorite) return false;
      }

      if (String(it.__type).toLowerCase() === "weapon") {
        const wType = getWeaponTypeValue(it);
        if (!triListPass([wType], wTypeOnlyList, wTypeBlackList)) return false;

        const baseKey = getWeaponBaseItem(it);
        if (!triListPass([baseKey], baseOnlyList, baseBlackList)) return false;

        const masteryKey = getWeaponMastery(it);
        if (!triListPass([masteryKey], masteryOnlyList, masteryBlackList)) return false;

        // ✅ PROPERTIES FIX
        const props = getWeaponProperties(it);
        if (!triListPass(props, propOnlyList, propBlackList)) return false;
      }

      return true;
    });

    // ✅ sorting
    const ascending = String(sortDir).toLowerCase() !== "desc";
    const dir = ascending ? 1 : -1;

    items.sort((a, b) => {
      switch (String(sortBy).toLowerCase()) {
        case "price": {
          const ap = getPriceCp(a);
          const bp = getPriceCp(b);
          if (ap == null && bp == null) return 0;
          if (ap == null) return 1;
          if (bp == null) return -1;
          return (ap - bp) * dir;
        }
        case "rarity": {
          const ar = getRarityKey(a);
          const br = getRarityKey(b);
          return ar.localeCompare(br) * dir;
        }
        case "favorites": {
          const af = Number(a.favorites_count ?? 0) || 0;
          const bf = Number(b.favorites_count ?? 0) || 0;
          return (af - bf) * dir;
        }
        case "name":
        default: {
          return (a.name || "").localeCompare(b.name || "") * dir;
        }
      }
    });

    return res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("❌ getFoundryItems Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// --------------------
// Favorite toggle
// --------------------
export const toggleFavoriteFoundryItem = async (req, res) => {
  try {
    const { type, id } = req.params;

    const tableInfo = getTableByType(type);
    if (!tableInfo) return res.status(400).json({ error: "Invalid item type" });

    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const userId = String(user.id);
    const username =
      user.username || user.name || user.full_name || user.email || "Unknown";

    const { data: item, error: fetchError } = await supabase
      .from(tableInfo.table)
      .select("id, favorites, favorites_count")
      .eq("id", id)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!item) return res.status(404).json({ error: "Item not found" });

    let favorites = Array.isArray(item.favorites) ? item.favorites : [];
    const already = favorites.find((f) => String(f.user_id) === userId);

    let action = "";
    if (already) {
      favorites = favorites.filter((f) => String(f.user_id) !== userId);
      action = "unfavorite";
    } else {
      favorites.push({ user_id: userId, username, at: new Date().toISOString() });
      action = "favorite";
    }

    const favorites_count = favorites.length;

    const { data: updated, error: updateError } = await supabase
      .from(tableInfo.table)
      .update({ favorites, favorites_count })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    return res.json({ success: true, action, favorites_count, item: updated });
  } catch (err) {
    console.error("❌ toggleFavoriteFoundryItem Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
