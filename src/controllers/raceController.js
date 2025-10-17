// src/controllers/raceController.js
import {
  getAllRaces,
  getRaceById,
  getRaceByName,
  createRace,
  updateRace,
  deleteRace,
} from "../models/raceModel.js";

export const getAll = async (req, res) => {
  try {
    const { data, error } = await getAllRaces();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getAll Races error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getRaceById(id);
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Race not found" });
    res.json(data);
  } catch (err) {
    console.error("❌ getById Race error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getByName = async (req, res) => {
  try {
    const { name } = req.params;
    const decoded = name.replace(/_/g, " ");
    const { data, error } = await getRaceByName(decoded);
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (err) {
    console.error("❌ getByName Race error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const { data, error } = await createRace(req.body);
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("❌ create Race error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await updateRace(id, req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ update Race error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await deleteRace(id);
    if (error) throw error;
    res.json({ message: "Race deleted successfully" });
  } catch (err) {
    console.error("❌ delete Race error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
