import supabase from "../utils/db.js";

const TABLE = "homebrew_sources";

function like(q) {
  return `%${String(q || "").trim()}%`;
}

const ALLOWED_SORT = new Set(["created_at", "name"]);

export async function listHomebrewSources({
  q,
  sort = "created_at",
  order = "desc",
  page = 1,
  limit = 20,
  created_by = null,
  privateOnly = null, // true/false/null
} = {}) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const from = (p - 1) * l;
  const to = from + l - 1;

  let query = supabase.from(TABLE).select("*", { count: "exact" });

  if (created_by) query = query.eq("created_by", created_by);
  if (privateOnly !== null && privateOnly !== undefined) {
    query = query.eq("private", Boolean(privateOnly));
  }

  if (q && String(q).trim()) {
    const pattern = like(q);
    // cari di name/description/share_id
    query = query.or(
      `name.ilike.${pattern},description.ilike.${pattern},share_id.ilike.${pattern}`
    );
  }

  const sortCol = ALLOWED_SORT.has(sort) ? sort : "created_at";
  const asc = String(order).toLowerCase() === "asc";

  query = query.order(sortCol, { ascending: asc }).range(from, to);

  const { data, error, count } = await query;
  if (error) return { data: null, error };

  return {
    data: data || [],
    error: null,
    meta: {
      page: p,
      limit: l,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / l),
      sort: sortCol,
      order: asc ? "asc" : "desc",
      q: q?.trim?.() || "",
      created_by: created_by || null,
      private: privateOnly === null ? null : Boolean(privateOnly),
    },
  };
}

export async function getHomebrewSourceById(id) {
  return await supabase.from(TABLE).select("*").eq("id", id).single();
}

export async function getHomebrewSourceByShareId(share_id) {
  return await supabase
    .from(TABLE)
    .select("*")
    .eq("share_id", share_id)
    .single();
}

export async function createHomebrewSource(payload) {
  return await supabase.from(TABLE).insert([payload]).select("*").single();
}

export async function updateHomebrewSource(id, payload) {
  return await supabase.from(TABLE).update(payload).eq("id", id).select("*").single();
}

export async function deleteHomebrewSource(id) {
  return await supabase.from(TABLE).delete().eq("id", id);
}
export async function getAllHomebrewSourcesPlain() {
  return await supabase
    .from(TABLE)
    .select("*");
}