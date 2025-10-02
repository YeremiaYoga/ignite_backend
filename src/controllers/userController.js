import { upsertUser, getUserByClerkId } from "../models/userModel.js";

// Login / Sync user
export const loginUser = async (req, res) => {
  try {
    const { clerkId, email, username } = req.body;

    if (!clerkId || !email || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await upsertUser({ clerkId, email, username });
    if (error) return res.status(500).json({ error: error.message });

    const user = Array.isArray(data) ? data[0] : data;

    res.cookie("userId", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


export const getUser = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { data, error } = await getUserByClerkId(clerkId);
    if (error) return res.status(404).json({ error: error.message });

    return res.json({ user: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
