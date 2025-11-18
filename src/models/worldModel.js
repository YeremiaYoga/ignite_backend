// models/worldModel.js
import supabase from "../utils/db.js";

// 🔧 helper untuk generate random code
function generateCode(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function generateWorldId() {
  // 20 random code internal
  return generateCode(20);
}

function generatePublicId() {
  // 23 random code untuk public
  return generateCode(23);
}

// 📄 GET semua world (admin)
export async function getWorlds() {
  const { data, error } = await supabase
    .from("worlds")
    .select("*") // termasuk jsonb & password (nanti bisa disembunyikan di controller)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// 📄 GET satu world berdasarkan id (UUID row)
export async function getWorldById(id) {
  const { data, error } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// 📄 (opsional tapi biasanya kepake) GET world by public_id
export async function getWorldByPublicId(publicId) {
  const { data, error } = await supabase
    .from("worlds")
    .select("*")
    .eq("public_id", publicId)
    .single();

  if (error) throw error;
  return data;
}

// ➕ CREATE world baru
export async function createWorld(payload = {}) {
  // world_id & public_id selalu digenerate di backend
  const world_id = generateWorldId();
  const public_id = generatePublicId();

  // abaikan jika user kirim world_id / public_id
  const { world_id: _wi, public_id: _pi, ...rest } = payload;

  const body = {
    ...rest,
    world_id,
    public_id,
  };

  const { data, error } = await supabase
    .from("worlds")
    .insert([body])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ✏️ UPDATE world
export async function updateWorld(id, payload = {}) {
  // pastikan world_id & public_id tidak bisa diubah dari luar
  const { world_id, public_id, id: _id, created_at, updated_at, ...rest } =
    payload;

  const { data, error } = await supabase
    .from("worlds")
    .update(rest)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// 🗑 DELETE world
export async function deleteWorld(id) {
  const { error } = await supabase.from("worlds").delete().eq("id", id);
  if (error) throw error;
  return true;
}
