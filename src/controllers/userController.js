// import pool from "../utils/db.js";

// export const syncUser = async (req, res) => {
//   try {
//     const { id: clerkId, emailAddresses, username } = req.auth.user;
//     const email = emailAddresses?.[0]?.emailAddress || null;

//     let result = await pool.query(
//       "SELECT * FROM users WHERE clerk_id = $1",
//       [clerkId]
//     );

//     if (result.rows.length === 0) {
//       result = await pool.query(
//         `INSERT INTO users (id, email, username, clerk_id, created_at)
//          VALUES (gen_random_uuid(), $1, $2, $3, now())
//          RETURNING *`,
//         [email, username, clerkId]
//       );
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("Sync user error:", err);
//     res.status(500).json({ error: "Failed to sync user" });
//   }
// };

import supabase from "../utils/db.js";

export const loginUser = async (req, res) => {
  try {
    const { clerkId, email, username } = req.body;

    if (!clerkId || !email || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("users")
      .upsert([{ clerk_id: clerkId, email, username }], {
        onConflict: "clerk_id",
      });

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, user: data });
  } catch (err) {
    console.error("Sync User Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const getUserById = async (req, res) => {
  const { clerkId } = req.params;

  if (!clerkId) {
    return res.status(400).json({ error: "clerkId is required" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", clerkId)
      .single(); 

    if (error) {
      console.error("Supabase getUser error:", error);
      return res.status(404).json({ error: error.message });
    }

    return res.json({ user: data });
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ error: err.message });
  }
};
