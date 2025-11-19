import {
  getAllGameSystems,
  getGameSystemById,
  createGameSystem,
  updateGameSystem,
  deleteGameSystem,
} from "../models/gameSystemModel.js";

// 📄 GET /game-systems
export const listGameSystems = async (req, res) => {
  try {
    const { data, error } = await getAllGameSystems();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ listGameSystems:", err);
    res.status(500).json({ message: "Failed to list game systems" });
  }
};

// 🔍 GET /game-systems/:id
export const getGameSystem = async (req, res) => {
  try {
    const { data, error } = await getGameSystemById(req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getGameSystem:", err);
    res.status(404).json({ message: "Game system not found" });
  }
};

// ➕ POST /game-systems
export const createGameSystemCtrl = async (req, res) => {
  try {
    const { data, error } = await createGameSystem(req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ createGameSystemCtrl:", err);
    res.status(400).json({ message: "Failed to create game system" });
  }
};

// ✏️ PUT /game-systems/:id
export const updateGameSystemCtrl = async (req, res) => {
  try {
    const { data, error } = await updateGameSystem(req.params.id, req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ updateGameSystemCtrl:", err);
    res.status(400).json({ message: "Failed to update game system" });
  }
};

// ❌ DELETE /game-systems/:id
export const deleteGameSystemCtrl = async (req, res) => {
  try {
    const { error } = await deleteGameSystem(req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("❌ deleteGameSystemCtrl:", err);
    res.status(400).json({ message: "Failed to delete game system" });
  }
};
