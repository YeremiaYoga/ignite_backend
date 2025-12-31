import supabase from "../utils/db.js";

/**
 * Ambil SEMUA journal (admin / internal)
 */
export async function listAllJournals({ q = null } = {}) {
  let query = supabase
    .from("journals")
    .select("*")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Ambil journal sesuai user:
 * - public
 * - private milik userId
 */
export async function listJournalsByUser({ userId, q = null } = {}) {
  let query = supabase
    .from("journals")
    .select("*")
    .order("created_at", { ascending: false });

  if (!userId) {
    // guest -> hanya public
    query = query.eq("private", false);
  } else {
    // public OR private milik user
    query = query.or(
      `private.eq.false,and(private.eq.true,creator_id.eq.${userId})`
    );
  }

  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function getJournalById(id) {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function getJournalByShareId(share_id) {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("share_id", share_id)
    .single();

  return { data, error };
}

export async function createJournal(payload) {
  const { data, error } = await supabase
    .from("journals")
    .insert(payload)
    .select("*")
    .single();

  return { data, error };
}

export async function updateJournalById(id, patch) {
  const { data, error } = await supabase
    .from("journals")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}

export async function deleteJournalById(id) {
  const { data, error } = await supabase
    .from("journals")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}
