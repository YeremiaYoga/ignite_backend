// src/controllers/ignite/journalController.js
import supabase from "../../utils/db.js";

import {
  listAllJournals,
  listJournalsByUser,
  getJournalById,
  getJournalByShareId,
  createJournal,
  updateJournalById,
  deleteJournalById,
} from "../../models/journalModel.js";

/* ---------------- permissions ---------------- */
function canReadJournal(user, journal) {
  if (!journal) return false;
  if (journal.private === false) return true;
  return user?.id === journal.creator_id;
}

/* ---------------- limits ---------------- */
async function getUserJournalLimit(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, tier, journal_limit")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("❌ getUserJournalLimit error:", error?.message);
    return { user: null, error: error || new Error("User not found") };
  }

  return { user: data, error: null };
}

async function enforceJournalLimitOnCreate(userId) {
  const { user, error } = await getUserJournalLimit(userId);
  if (error || !user) {
    return {
      ok: false,
      status: 400,
      payload: { success: false, message: "User not found" },
    };
  }

  const limit = user.journal_limit; // null = unlimited

  const { count, error: countError } = await supabase
    .from("journals")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", userId);

  if (countError) {
    console.error("❌ enforceJournalLimit count error:", countError.message);
    return {
      ok: false,
      status: 500,
      payload: { success: false, message: "Failed to check journal count" },
    };
  }

  if (limit !== null && count >= limit) {
    return {
      ok: false,
      status: 403,
      payload: {
        success: false,
        message: `Journal limit reached (${limit}). Upgrade your plan to create more.`,
        tier: user.tier,
        limit,
        count,
      },
    };
  }

  return { ok: true, status: 200, payload: null };
}

/* ---------------- helpers (pages + count + fvtt) ---------------- */
function normalizeLevel(v) {
  const n = Number(v);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

function normalizePages(pages) {
  if (!Array.isArray(pages)) return [];
  return pages.map((p, idx) => ({
    id: p?.id ?? `page_${idx}`,
    name: String(p?.name || "").trim() || `Page Name ${idx + 1}`,
    content: p?.content ?? "",
    show_title: typeof p?.show_title === "boolean" ? p.show_title : true,
    level: normalizeLevel(p?.level),
  }));
}


function computeCharacterCount({ pages, description }) {
  let total = 0;

  if (description !== undefined && description !== null) {
    total += String(description).length;
  }

  if (Array.isArray(pages)) {
    for (const p of pages) {
      total += String(p?.content ?? "").length;
    }
  }

  return total;
}

function buildFvttFormat({ name, pages }) {
  const safeName = String(name || "").trim() || "Untitled Journal";

  const fvttPages = (pages || []).map((p, idx) => {
    const pageName = String(p?.name || "").trim() || `Page Name ${idx + 1}`;
    const content = p?.content ?? "";
    const show_title = typeof p?.show_title === "boolean" ? p.show_title : true;
    const level = normalizeLevel(p?.level);

    return {
      name: pageName,
      type: "text",
      text: { format: 1, content },
      _id: String(idx + 1).padStart(16, "0"),
      title: { show: show_title, level },
    };
  });

  return { name: safeName, pages: fvttPages };
}

/* ---------------- controllers ---------------- */
export async function getIgniteJournals(req, res) {
  try {
    const userId = req.user.id;
    const { data, error } = await listJournalsByUser({ userId });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error("❌ getIgniteJournals:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getAllIgniteJournals(req, res) {
  try {
    const { data, error } = await listAllJournals();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error("❌ getAllIgniteJournals:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getIgniteJournalDetail(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await getJournalById(id);
    if (error || !data) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (!canReadJournal(req.user, data)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ getIgniteJournalDetail:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getIgniteJournalByShare(req, res) {
  try {
    const { shareId } = req.params;

    const { data, error } = await getJournalByShareId(shareId);
    if (error || !data) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (!canReadJournal(req.user, data)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ getIgniteJournalByShare:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function createIgniteJournalHandler(req, res) {
  try {
    const user = req.user;

    const gate = await enforceJournalLimitOnCreate(user.id);
    if (!gate.ok) return res.status(gate.status).json(gate.payload);

    const {
      name,
      description = null,
      private: isPrivate,
      share_id,
      pages,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "name is required" });
    }

    if (!share_id || !String(share_id).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "share_id is required" });
    }

    const normalizedPages = normalizePages(
      Array.isArray(pages) && pages.length
        ? pages
        : [
            {
              id: `page_${Date.now()}`,
              name: "Page Name 1",
              content: "",
              show_title: true,
              level: 1,
            },
          ]
    );

    const safeName = String(name).trim();
    const safeDescription = description ?? null;

    const fvtt_format = buildFvttFormat({
      name: safeName,
      pages: normalizedPages,
    });

    // ✅ character_count hitung HTML apa adanya (description + pages)
    const character_count = computeCharacterCount({
      pages: normalizedPages,
      description: safeDescription,
    });

    const payload = {
      name: safeName,
      description: safeDescription,
      private: typeof isPrivate === "boolean" ? isPrivate : true,
      share_id: String(share_id).trim(),

      pages: normalizedPages,
      character_count,
      fvtt_format,

      creator_id: user.id,
      creator_name: user.username || user.name || user.email || "Unknown",
    };

    const { data, error } = await createJournal(payload);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error("❌ createIgniteJournalHandler:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * UPDATE:
 * - bisa patch name/description/private/pages/share_id(optional)
 * - kalau pages ada => update pages + character_count + fvtt_format
 * - kalau pages gak ada tapi name berubah => fvtt_format name ikut berubah pakai pages existing
 * - kalau description berubah => character_count wajib ikut update (description dihitung)
 */
export async function updateIgniteJournalHandler(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    const current = await getJournalById(id);
    if (current.error || !current.data) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (current.data.creator_id !== user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { name, description, private: isPrivate, pages, share_id } = req.body;

    const patch = {};

    // basic fields
    if (typeof name === "string" && name.trim()) patch.name = name.trim();
    if (description !== undefined) patch.description = description;
    if (typeof isPrivate === "boolean") patch.private = isPrivate;

    // kalau kamu memang mau allow edit share_id (kalau enggak, hapus block ini)
    if (typeof share_id === "string" && share_id.trim()) {
      patch.share_id = share_id.trim();
    }

    const nextName = (patch.name || current.data.name || "").trim();
    const nextDescription =
      patch.description !== undefined ? patch.description : current.data.description;

    if (pages !== undefined) {
      const normalizedPages = normalizePages(pages);

      patch.pages = normalizedPages;
      patch.fvtt_format = buildFvttFormat({ name: nextName, pages: normalizedPages });

      // ✅ character_count = description + pages (HTML apa adanya)
      patch.character_count = computeCharacterCount({
        pages: normalizedPages,
        description: nextDescription,
      });
    } else {
      // pages tidak diupdate, tapi name/description mungkin berubah
      // fvtt_format name perlu ikut kalau name berubah
      if (patch.name) {
        const normalizedPages = normalizePages(current.data.pages || []);
        patch.fvtt_format = buildFvttFormat({ name: patch.name, pages: normalizedPages });
      }

      // ✅ kalau description berubah, tetap update character_count
      if (patch.description !== undefined) {
        const normalizedPages = normalizePages(current.data.pages || []);
        patch.character_count = computeCharacterCount({
          pages: normalizedPages,
          description: nextDescription,
        });
      }
    }

    const { data, error } = await updateJournalById(id, patch);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ updateIgniteJournalHandler:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function deleteIgniteJournalHandler(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    const current = await getJournalById(id);
    if (current.error || !current.data) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (current.data.creator_id !== user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { data, error } = await deleteJournalById(id);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ deleteIgniteJournalHandler:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
