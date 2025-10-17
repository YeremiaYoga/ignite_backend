import {
  getAllBackgrounds,
  getBackgroundById,
  createBackground,
  updateBackground,
  deleteBackground,
} from "../models/backgroundModel.js";

export const fetchAllBackgrounds = async (req, res) => {
  try {
    const data = await getAllBackgrounds();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fetchBackgroundById = async (req, res) => {
  try {
    const data = await getBackgroundById(req.params.id);
    if (!data) return res.status(404).json({ error: "Background not found" });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createNewBackground = async (req, res) => {
  try {
    const newData = await createBackground(req.body);
    res.status(201).json(newData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateBackgroundData = async (req, res) => {
  try {
    const updated = await updateBackground(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteBackgroundData = async (req, res) => {
  try {
    await deleteBackground(req.params.id);
    res.status(200).json({ message: "Background deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
