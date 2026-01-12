// controllers/igniteTokenBorderController.js
import {
  getTokenBorders,
  getTokenBorderById,
} from "../../models/tokenBorderModel.js";

function todayISODate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isVisibleByDate(releaseDate, today) {
  if (!releaseDate) return false;

  const s = String(releaseDate).trim();
  if (!s) return false;

  return s <= today;
}

export const listIgniteTokenBordersHandler = async (req, res) => {
  try {
    const items = await getTokenBorders();
    const today = todayISODate();

    const filtered = (Array.isArray(items) ? items : []).filter((it) =>
      isVisibleByDate(it?.release_date, today)
    );

    return res.json({ success: true, items: filtered });
  } catch (err) {
    console.error("💥 listIgniteTokenBordersHandler error:", err.message);
    return res.status(500).json({ error: "Failed to load token borders" });
  }
};

export const getIgniteTokenBorderHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Token border id is required" });
    }

    const item = await getTokenBorderById(id);
    if (!item) {
      return res.status(404).json({ error: "Token border not found" });
    }

    const today = todayISODate();
    if (!isVisibleByDate(item?.release_date, today)) {
      return res.status(404).json({ error: "Token border not found" });
    }

    return res.json({ success: true, item });
  } catch (err) {
    console.error("💥 getIgniteTokenBorderHandler error:", err.message);
    return res.status(500).json({ error: "Failed to get token border" });
  }
};
