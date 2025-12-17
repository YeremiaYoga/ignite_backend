import supabase from "../utils/db.js";

/**
 * GET /ignite/feats
 * Query params:
 * - q            : string (search name / description)
 * - type         : string
 * - category     : string
 * - sort_by      : column name (default: created_at)
 * - sort_order   : asc | desc (default: desc)
 */
export const getIgniteFeatsHandler = async (req, res) => {
  try {
    const {
      q,
      type,
      category,
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    let query = supabase.from("feats").select("*");

    // =====================
    // SEARCH (ILIKE)
    // =====================
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%`
      );
    }

    // =====================
    // FILTERS
    // =====================
    if (type) {
      query = query.eq("type", type);
    }

    if (category) {
      query = query.eq("category", category);
    }

    // =====================
    // SORTING
    // =====================
    query = query.order(sort_by, {
      ascending: sort_order === "asc",
    });

    const { data, error } = await query;

    if (error) {
      console.error("❌ getIgniteFeatsHandler:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error("❌ getIgniteFeatsHandler (catch):", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
