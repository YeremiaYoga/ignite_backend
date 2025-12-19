// controllers/igniteFeatController.js
import supabase from "../../utils/db.js";

export const getIgniteFeatsHandler = async (req, res) => {
  try {
    const {
      q,
      type,          // kolom: type
      category,      // dipetakan ke feat_type
      feat_type,     // optional: kalau mau kirim langsung feat_type
      subtype,       // kolom: subtype
      source_book,   // kolom: source_book
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    // whitelist kolom yang boleh di-sort
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

    // 🔍 search: name / description / requirements / properties
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,requirements.ilike.%${q}%,properties.ilike.%${q}%`
      );
    }

    // 🎯 filter: type
    if (type) {
      query = query.eq("type", type);
    }

    // 🎯 filter: feat_type (pakai feat_type atau category)
    const featTypeFilter = feat_type || category;
    if (featTypeFilter) {
      query = query.eq("feat_type", featTypeFilter);
    }

    // 🎯 filter: subtype
    if (subtype) {
      query = query.eq("subtype", subtype);
    }

    // 🎯 filter: source_book
    if (source_book) {
      query = query.eq("source_book", source_book);
    }

    // 📌 sorting
    query = query.order(sortColumn, {
      ascending: sort_order === "asc",
    });

    const { data, error } = await query;

    if (error) {
      console.error("❌ getIgniteFeatsHandler:", error);
      return res.status(400).json({ error: error.message });
    }

    // bisa pakai { data } kalau mau konsisten dengan endpoint lain
    return res.json(data || []);
  } catch (err) {
    console.error("❌ getIgniteFeatsHandler (catch):", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
