import {
  getAllFeats,
  getFeatById,
  createFeat,
  updateFeat,
  deleteFeat,
} from "../models/featModel.js";

// === GET ALL ===
export const fetchAllFeats = async (req, res) => {
  try {
    const { data, error } = await getAllFeats();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ fetchAllFeats error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// === GET BY ID ===
export const fetchFeatById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getFeatById(id);
    if (error || !data) throw new Error("Feat not found");
    res.json(data);
  } catch (err) {
    console.error("❌ fetchFeatById error:", err.message);
    res.status(404).json({ error: err.message });
  }
};

// === CREATE ===
export const createNewFeat = async (req, res) => {
  try {
    const body = req.body;

    // 🔧 convert tags ke array jika dikirim dalam string
    if (typeof body.tags === "string") {
      try {
        body.tags = JSON.parse(body.tags);
      } catch {
        body.tags = [body.tags];
      }
    }

    const { data, error } = await createFeat(body);
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("❌ createNewFeat error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// === UPDATE ===
export const updateFeatData = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (typeof body.tags === "string") {
      try {
        body.tags = JSON.parse(body.tags);
      } catch {
        body.tags = [body.tags];
      }
    }

    const { data, error } = await updateFeat(id, body);
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ updateFeatData error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// === DELETE ===
export const deleteFeatData = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await deleteFeat(id);
    if (error) throw error;
    res.json({ success: true, message: "Feat deleted successfully" });
  } catch (err) {
    console.error("❌ deleteFeatData error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
