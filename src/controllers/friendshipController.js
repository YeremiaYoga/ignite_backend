// controllers/friendshipController.js
import supabase from "../utils/db.js";

import {
  getFriendshipBetween,
  createFriendRequest,
  updateFriendshipById,
  deleteFriendshipBetween,
  listFriendshipsForUser,
  deleteFriendshipById, // 🆕
  listPendingFriendshipsForUser,
} from "../models/friendshipModel.js";

/**
 * Helper: ambil user + friend_code
 */
async function getUserWithFriendCodeById(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, username, profile_picture, friend_code")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("❌ getUserWithFriendCodeById error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Helper: ambil user by friend_code
 */
async function getUserByFriendCode(friendCode) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, username, profile_picture, friend_code")
    .eq("friend_code", friendCode)
    .single();

  if (error) {
    console.error("❌ getUserByFriendCode error:", error.message);
    throw error;
  }

  return data;
}

/**
 * POST /friends/add-by-code
 * body: { friend_code }
 */
export const addFriendByCode = async (req, res) => {
  try {
    const me = req.user?.id;
    const { friend_code } = req.body;

    if (!me) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!friend_code) {
      return res.status(400).json({ error: "friend_code is required" });
    }

    // cari target user by friend_code
    const target = await getUserByFriendCode(friend_code);

    if (!target) {
      return res.status(404).json({ error: "Friend code not found" });
    }

    if (target.id === me) {
      return res
        .status(400)
        .json({ error: "You cannot send a friend request to yourself" });
    }

    // ambil data user sendiri buat friend_code
    const meUser = await getUserWithFriendCodeById(me);

    if (!meUser.friend_code) {
      return res
        .status(500)
        .json({ error: "Your account does not have a friend_code yet" });
    }

    // cek apakah sudah ada hubungan
    const existing = await getFriendshipBetween(me, target.id);

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).send("You are already friends");
      }
      if (existing.status === "pending") {
        return res.status(400).send("There is already a pending request");
      }
      if (existing.status === "blocked") {
        return res.status(400).send("Blocked");
      }
    }

    // buat friend request baru (pending)
    const friendship = await createFriendRequest({
      fromUserId: me,
      toUserId: target.id,
      fromCode: meUser.friend_code,
      toCode: target.friend_code,
    });

    return res.json({
      success: true,
      message: "Friend request sent",
      friendship,
    });
  } catch (err) {
    console.error("💥 addFriendByCode error:", err);
    return res.status(500).json({ error: "Failed to send friend request" });
  }
};

/**
 * POST /friends/respond
 * body: { friendship_id, action }  // action: "accept" | "reject"
 */
export const respondFriendRequest = async (req, res) => {
  try {
    const me = req.user?.id;
    const { friendship_id, action } = req.body;

    if (!me) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!friendship_id || !action) {
      return res
        .status(400)
        .json({ error: "friendship_id and action are required" });
    }

    const { data: friendship, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("id", friendship_id)
      .single();

    if (error || !friendship) {
      console.error("❌ respondFriendRequest fetch error:", error?.message);
      return res.status(404).json({ error: "Friendship not found" });
    }

    const { user_a_id, user_b_id, requester_id, status } = friendship;

    if (status !== "pending") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    const imInThis = me === user_a_id || me === user_b_id;
    if (!imInThis) {
      return res
        .status(403)
        .json({ error: "You are not part of this friendship" });
    }

    if (me === requester_id) {
      return res
        .status(403)
        .json({ error: "Requester cannot accept their own request" });
    }

    // 🆕 aksi BLOCK dari incoming request
    if (action === "block") {
      const updated = await updateFriendshipById(friendship_id, {
        status: "blocked",
        blocked_by: me,
      });

      return res.json({
        success: true,
        message: "User blocked",
        friendship: updated,
      });
    }

    if (action === "reject") {
      await supabase.from("friendships").delete().eq("id", friendship_id);
      return res.json({ success: true, message: "Friend request rejected" });
    }

    if (action === "accept") {
      const updated = await updateFriendshipById(friendship_id, {
        status: "accepted",
      });
      return res.json({
        success: true,
        message: "Friend request accepted",
        friendship: updated,
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("💥 respondFriendRequest error:", err);
    return res.status(500).json({ error: "Failed to respond to request" });
  }
};

/**
 * DELETE /friends/:friendId
 * - Hapus pertemanan antara current user dan friendId (user.id teman)
 */
export const removeFriend = async (req, res) => {
  try {
    const me = req.user?.id;
    const { friendId } = req.params;

    if (!me) return res.status(401).json({ error: "Unauthorized" });
    if (!friendId) {
      return res.status(400).json({ error: "friendId is required" });
    }

    const friendship = await getFriendshipBetween(me, friendId);

    if (!friendship || friendship.status !== "accepted") {
      return res.status(404).json({ error: "Friendship not found" });
    }

    await deleteFriendshipBetween(me, friendId);

    return res.json({ success: true, message: "Friend removed" });
  } catch (err) {
    console.error("💥 removeFriend error:", err);
    return res.status(500).json({ error: "Failed to remove friend" });
  }
};

/**
 * POST /friends/block
 * body: { target_user_id }
 */
export const blockUser = async (req, res) => {
  try {
    const me = req.user?.id;
    const { target_user_id } = req.body;

    if (!me) return res.status(401).json({ error: "Unauthorized" });
    if (!target_user_id) {
      return res.status(400).json({ error: "target_user_id is required" });
    }
    if (me === target_user_id) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    const existing = await getFriendshipBetween(me, target_user_id);

    if (existing) {
      const updated = await updateFriendshipById(existing.id, {
        status: "blocked",
        blocked_by: me,
      });
      return res.json({
        success: true,
        message: "User blocked",
        friendship: updated,
      });
    }

    // kalau belum ada relation, buat row baru dengan status blocked
    const meUser = await getUserWithFriendCodeById(me);
    const targetUser = await getUserWithFriendCodeById(target_user_id);

    const created = await createFriendRequest({
      fromUserId: me,
      toUserId: target_user_id,
      fromCode: meUser.friend_code,
      toCode: targetUser.friend_code,
    });

    const updated = await updateFriendshipById(created.id, {
      status: "blocked",
      blocked_by: me,
    });

    return res.json({
      success: true,
      message: "User blocked",
      friendship: updated,
    });
  } catch (err) {
    console.error("💥 blockUser error:", err);
    return res.status(500).json({ error: "Failed to block user" });
  }
};

/**
 * GET /friends
 * - List semua teman (status = accepted)
 */
export const listFriends = async (req, res) => {
  try {
    const me = req.user?.id;
    if (!me) return res.status(401).json({ error: "Unauthorized" });

    const friendships = await listFriendshipsForUser(me, "accepted");

    if (!friendships.length) {
      return res.json({ success: true, friends: [] });
    }

    // ambil id teman (dari pair user_a / user_b)
    const friendIds = friendships.map((f) =>
      f.user_a_id === me ? f.user_b_id : f.user_a_id
    );

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, username, profile_picture, friend_code")
      .in("id", friendIds);

    if (error) {
      console.error("❌ listFriends users error:", error.message);
      return res.status(500).json({ error: "Failed to fetch friends data" });
    }

    const friends = friendships.map((f) => {
      const friendId = f.user_a_id === me ? f.user_b_id : f.user_a_id;
      const friendUser = users.find((u) => u.id === friendId);
      return {
        friendship_id: f.id,
        friend: friendUser,
        created_at: f.created_at,
      };
    });

    return res.json({ success: true, friends });
  } catch (err) {
    console.error("💥 listFriends error:", err);
    return res.status(500).json({ error: "Failed to list friends" });
  }
};

/**
 * GET /friends/requests
 * - List incoming & outgoing requests (status pending)
 */
export const listFriendRequests = async (req, res) => {
  try {
    const me = req.user?.id;
    if (!me) return res.status(401).json({ error: "Unauthorized" });

    const pending = await listPendingFriendshipsForUser(me);

    const incoming = [];
    const outgoing = [];

    for (const f of pending || []) {
      if (f.requester_id === me) {
        outgoing.push(f);
      } else {
        incoming.push(f);
      }
    }

    // ambil semua user yang terlibat
    const userIds = Array.from(
      new Set((pending || []).flatMap((f) => [f.user_a_id, f.user_b_id]))
    );

    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id, name, username, profile_picture, friend_code")
      .in("id", userIds);

    if (userErr) {
      console.error("❌ listFriendRequests users error:", userErr.message);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    const mapUser = (id) => users.find((u) => u.id === id) || null;

    const formatReq = (f) => {
      const friendId = f.user_a_id === me ? f.user_b_id : f.user_a_id;
      return {
        friendship_id: f.id,
        requester_id: f.requester_id,
        friend_user: mapUser(friendId),
        created_at: f.created_at,
      };
    };

    return res.json({
      success: true,
      incoming: incoming.map(formatReq),
      outgoing: outgoing.map(formatReq),
    });
  } catch (err) {
    console.error("💥 listFriendRequests error:", err);
    return res.status(500).json({ error: "Failed to list friend requests" });
  }
};

export const listBlockedFriends = async (req, res) => {
  try {
    const me = req.user?.id;
    if (!me) return res.status(401).json({ error: "Unauthorized" });

    // ambil semua relasi status "blocked" yang melibatkan gue
    let blocked = await listFriendshipsForUser(me, "blocked");

    // 🆕 hanya tampilkan kalau GUE yang nge-block
    blocked = (blocked || []).filter((f) => f.blocked_by === me);

    if (!blocked.length) {
      return res.json({ success: true, blocked: [] });
    }

    const friendIds = blocked.map((f) =>
      f.user_a_id === me ? f.user_b_id : f.user_a_id
    );

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, username, profile_picture, friend_code")
      .in("id", friendIds);

    if (error) {
      console.error("❌ listBlockedFriends users error:", error.message);
      return res.status(500).json({ error: "Failed to fetch blocked users" });
    }

    const friends = blocked.map((f) => {
      const friendId = f.user_a_id === me ? f.user_b_id : f.user_a_id;
      const friendUser = users.find((u) => u.id === friendId);
      return {
        friendship_id: f.id,
        friend: friendUser,
        created_at: f.created_at,
        blocked_by: f.blocked_by,
      };
    });

    return res.json({ success: true, blocked: friends });
  } catch (err) {
    console.error("💥 listBlockedFriends error:", err);
    return res.status(500).json({ error: "Failed to list blocked users" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const me = req.user?.id;
    const { friendship_id } = req.body;

    if (!me) return res.status(401).json({ error: "Unauthorized" });
    if (!friendship_id) {
      return res.status(400).json({ error: "friendship_id is required" });
    }

    const { data: friendship, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("id", friendship_id)
      .single();

    if (error || !friendship) {
      console.error("❌ unblockUser fetch error:", error?.message);
      return res.status(404).json({ error: "Friendship not found" });
    }

    if (friendship.status !== "blocked") {
      return res.status(400).json({ error: "Friendship is not blocked" });
    }

    // opsional: hanya yang nge-block yang boleh unblock
    if (friendship.blocked_by && friendship.blocked_by !== me) {
      return res
        .status(403)
        .json({ error: "You are not the one who blocked this user" });
    }

    // ✅ Unblock = balik jadi teman
    const updated = await updateFriendshipById(friendship_id, {
      status: "accepted",
      blocked_by: null,
    });

    return res.json({
      success: true,
      message: "User unblocked and added back as friend",
      friendship: updated,
    });
  } catch (err) {
    console.error("💥 unblockUser error:", err);
    return res.status(500).json({ error: "Failed to unblock user" });
  }
};
