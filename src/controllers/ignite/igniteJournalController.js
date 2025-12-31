import {
  listAllJournals,
  listJournalsByUser,
  getJournalById,
  getJournalByShareId,
  createJournal,
  updateJournalById,
  deleteJournalById,
} from "../../models/journalModel.js";

function canReadJournal(user, journal) {
  if (!journal) return false;
  if (journal.private === false) return true;
  return user?.id === journal.creator_id;
}

/**
 * GET /ignite/journals
 */
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

/**
 * GET /ignite/journals/all
 */
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

/**
 * GET /ignite/journals/:id
 */
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

/**
 * GET /ignite/journals/share/:shareId
 */
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

/**
 * POST /ignite/journals
 * NOTE: share_id HARUS dikirim dari frontend
 */
export async function createIgniteJournalHandler(req, res) {
  try {
    const user = req.user;

    const {
      name,
      description = null,
      fvtt_format,
      private: isPrivate,
      share_id,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    if (!share_id || !String(share_id).trim()) {
      return res.status(400).json({
        success: false,
        message: "share_id is required",
      });
    }

    if (fvtt_format === undefined || fvtt_format === null) {
      return res.status(400).json({
        success: false,
        message: "fvtt_format is required",
      });
    }

    const payload = {
      name: String(name).trim(),
      description,
      fvtt_format,
      private: typeof isPrivate === "boolean" ? isPrivate : true,
      share_id: String(share_id).trim(),
      creator_id: user.id,
      creator_name: user.name || "Unknown",
    };

    const { data, error } = await createJournal(payload);
    if (error) {
      // kemungkinan besar duplicate share_id
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error("❌ createIgniteJournalHandler:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /ignite/journals/:id
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

    const { name, description, fvtt_format, private: isPrivate } = req.body;

    const patch = {};
    if (typeof name === "string") patch.name = name.trim();
    if (description !== undefined) patch.description = description;
    if (fvtt_format !== undefined) patch.fvtt_format = fvtt_format;
    if (typeof isPrivate === "boolean") patch.private = isPrivate;

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

/**
 * DELETE /ignite/journals/:id
 */
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

    const { error } = await deleteJournalById(id);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error("❌ deleteIgniteJournalHandler:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
