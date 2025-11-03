import supabase from "../utils/db.js";
import bcrypt from "bcryptjs";

/**
 * Pastikan user punya role admin atau superadmin
 */
function ensureAdmin(req, res) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    res.status(403).json({ error: "Access denied: Admins only" });
    return false;
  }
  return true;
}

/**
 * GET semua user
 */
export const getAllUsers = async (req, res) => {
  if (!ensureAdmin(req, res)) return;

  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, users: data });
};

/**
 * GET user by id
 */
export const getUserById = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const { id } = req.params;

  const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
  if (error) return res.status(404).json({ error: error.message });

  res.json({ success: true, user: data });
};

/**
 * POST create user baru
 */
export const createUser = async (req, res) => {
  if (!ensureAdmin(req, res)) return;

  const { email, password, username, role } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password: hashedPassword, name: username, role: role || "user" }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, user: data });
};

/**
 * PUT update user
 */
export const updateUserById = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const { id } = req.params;
  const { email, username, role, password } = req.body;

  const updateData = { email, name: username, role };
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, user: data });
};

/**
 * DELETE user
 */
export const deleteUserById = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const { id } = req.params;

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, message: "User deleted successfully" });
};
