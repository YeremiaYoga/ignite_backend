// controllers/igniteFeatController.js
import supabase from "../../utils/db.js";

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

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%`
      );
    }

    // optional filter type/category (pastikan kolomnya ada di tabel)
    if (type) {
      query = query.eq("type", type);
    }

    if (category) {
      query = query.eq("category", category);
    }

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
