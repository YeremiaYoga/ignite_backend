// controllers/igniteFeatController.js
import supabase from "../../utils/db.js";

const DEFAULT_LEVEL_MIN = 0;
const DEFAULT_LEVEL_MAX = 20;

export const getIgniteFeatsHandler = async (req, res) => {
  try {
    const {
      q,
      feat_type,
      sort_by = "created_at",
      sort_order = "desc",
      level_min,
      level_max,
      repeatable,
    } = req.query;

    const ALLOWED_SORT_COLUMNS = [
      "created_at",
      "updated_at",
      "name",
      "type",
      "feat_type",
      "favorites_count",
    ];

    const sortColumn = ALLOWED_SORT_COLUMNS.includes(sort_by)
      ? sort_by
      : "created_at";

    let query = supabase.from("foundry_feats").select("*");

    if (q && q.trim()) {
      query = query.ilike("name", `%${q.trim()}%`);
    }


    const featTypeFilter = feat_type;
    if (featTypeFilter) {
      const arr = String(featTypeFilter)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (arr.length === 1) {
        query = query.eq("subtype", arr[0]);        
      } else if (arr.length > 1) {
        query = query.in("subtype", arr);          
      }
    }

    // 🎯 Level range – cuma aktif kalau user ubah dari default 0–20
    const hasLevelMinParam = level_min !== undefined && level_min !== "";
    const hasLevelMaxParam = level_max !== undefined && level_max !== "";

    if (hasLevelMinParam || hasLevelMaxParam) {
      const lvMin = hasLevelMinParam
        ? Number(level_min)
        : DEFAULT_LEVEL_MIN;
      const lvMax = hasLevelMaxParam
        ? Number(level_max)
        : DEFAULT_LEVEL_MAX;

      const isDefaultRange =
        lvMin === DEFAULT_LEVEL_MIN && lvMax === DEFAULT_LEVEL_MAX;

      if (!isDefaultRange) {
        if (!Number.isNaN(lvMin)) {
          // prerequisites adalah jsonb, level disimpan di key "level"
          query = query.gte("prerequisites->>level", lvMin);
        }
        if (!Number.isNaN(lvMax)) {
          query = query.lte("prerequisites->>level", lvMax);
        }
      }
    }

    // 🎯 repeatable true/false (hanya kalau true)
    if (repeatable === "true") {
      query = query.eq("prerequisites->>repeatable", "true");
    }

    // 📌 sorting
    query = query.order(sortColumn, {
      ascending: sort_order === "asc",
    });

    const { data, error } = await query;

    if (error) {
      console.error("❌ getIgniteFeatsHandler supabase error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error("❌ getIgniteFeatsHandler (catch):", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
