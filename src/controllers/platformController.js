import {
  getAllPlatforms,
  getPlatformById,
  createPlatform,
  updatePlatform,
  deletePlatform,
} from "../models/platformModel.js";

// 📄 GET /platforms
export const listPlatforms = async (req, res) => {
  try {
    const { data, error } = await getAllPlatforms();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ listPlatforms:", err);
    res.status(500).json({ message: "Failed to list platforms" });
  }
};

// 🔍 GET /platforms/:id
export const getPlatform = async (req, res) => {
  try {
    const { data, error } = await getPlatformById(req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getPlatform:", err);
    res.status(404).json({ message: "Platform not found" });
  }
};

// ➕ POST /platforms
export const createPlatformCtrl = async (req, res) => {
  try {
    const { data, error } = await createPlatform(req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ createPlatformCtrl:", err);
    res.status(400).json({ message: "Failed to create platform" });
  }
};

// ✏️ PUT /platforms/:id
export const updatePlatformCtrl = async (req, res) => {
  try {
    const { data, error } = await updatePlatform(req.params.id, req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ updatePlatformCtrl:", err);
    res.status(400).json({ message: "Failed to update platform" });
  }
};

// ❌ DELETE /platforms/:id
export const deletePlatformCtrl = async (req, res) => {
  try {
    const { error } = await deletePlatform(req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("❌ deletePlatformCtrl:", err);
    res.status(400).json({ message: "Failed to delete platform" });
  }
};
