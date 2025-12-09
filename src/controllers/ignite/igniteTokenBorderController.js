// controllers/igniteTokenBorderController.js
import {
  getTokenBorders,
  getTokenBorderById,
} from "../../models/tokenBorderModel.js";


export const listIgniteTokenBordersHandler = async (req, res) => {
  try {
    const items = await getTokenBorders();
    return res.json({ success: true, items });
  } catch (err) {
    console.error("💥 listIgniteTokenBordersHandler error:", err.message);
    return res
      .status(500)
      .json({ error: "Failed to load token borders" });
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

    return res.json({ success: true, item });
  } catch (err) {
    console.error("💥 getIgniteTokenBorderHandler error:", err.message);
    return res
      .status(500)
      .json({ error: "Failed to get token border" });
  }
};
