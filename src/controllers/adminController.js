import supabase from "../utils/db.js";
import bcrypt from "bcryptjs";

/**
 * Pastikan user punya role admin atau superadmin
 */
function ensureAdmin(req, res) {
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "superadmin")
  ) {
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

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, users: data });
};

/**
 * GET user by id
 */
export const getUserById = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return res.status(404).json({ error: error.message });

  res.json({ success: true, user: data });
};

/**
 * POST create user baru
 */

export const createUser = async (req, res) => {
  if (!ensureAdmin(req, res)) return;

  try {
    const {
      email,
      password,
      username,
      name,
      role = "user",
      tier_id,
      profile_picture,
    } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let tierInfo = { slug: "free", character_limit: 5, id: null };

    if (tier_id) {
      const { data: tierData, error: tierError } = await supabase
        .from("tiers")
        .select("id, slug, character_limit, is_unlimited")
        .eq("id", tier_id)
        .single();

      if (!tierError && tierData) {
        tierInfo = {
          slug: tierData.slug,
          id: tierData.id,
          character_limit: tierData.is_unlimited
            ? null
            : tierData.character_limit,
        };
      } else {
        console.warn("⚠️ Tier not found, using default free tier");
      }
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          password: hashedPassword,
          username,
          name: name?.trim() || username.trim(),
          role,
          tier: tierInfo.slug,
          tier_id: tierInfo.id,
          character_limit: tierInfo.character_limit,
          profile_picture:
            profile_picture ||
            `${process.env.PUBLIC_MEDIA_URL}/profile_picture/Candle.webp`,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, user: data });
  } catch (err) {
    console.error("❌ createUser error:", err.message);
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const updateUserById = async (req, res) => {
  if (!ensureAdmin(req, res)) return;

  try {
    const { id } = req.params;
    const {
      email,
      username,
      name,
      role,
      password,
      tier_id,
      profile_picture,
    } = req.body;

    const updateData = {
      ...(email && { email }),
      ...(username && { username }),
      ...(name && { name: name.trim() }),
      ...(role && { role }),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (tier_id) {
      const { data: tierData, error: tierError } = await supabase
        .from("tiers")
        .select("id, slug, character_limit, is_unlimited")
        .eq("id", tier_id)
        .single();

      if (!tierError && tierData) {
        updateData.tier = tierData.slug;
        updateData.tier_id = tierData.id;
        updateData.character_limit = tierData.is_unlimited
          ? null
          : tierData.character_limit;
      } else {
        console.warn("⚠️ Invalid tier_id provided, keeping existing tier");
      }
    }

    if (profile_picture) updateData.profile_picture = profile_picture;

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, user: data });
  } catch (err) {
    console.error("❌ updateUserById error:", err.message);
    res.status(500).json({ error: "Failed to update user" });
  }
};


export const deleteUserById = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const { id } = req.params;

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, message: "User deleted successfully" });
};
