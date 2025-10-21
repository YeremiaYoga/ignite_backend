import {
  getAllSubraces,
  getSubracesByRaceId,
  createSubrace,
  updateSubrace,
  removeSubrace,
} from "../models/subraceModel.js";


export const getAll = async (req, res) => {
  try {
    const { data, error } = await getAllSubraces();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getAll Subrace error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getByRaceId = async (req, res) => {
  try {
    const { raceId } = req.params;

    if (!raceId) {
      return res.status(400).json({ error: "Missing raceId parameter" });
    }

    const { data, error } = await getSubracesByRaceId(raceId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No subraces found for this race" });
    }

    res.json(data);
  } catch (err) {
    console.error("❌ getByRaceId Subrace error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};





export const create = async (req, res) => {
  try {
    const { data, error } = await createSubrace(req.body);
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("❌ create Subrace error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await updateSubrace(id, req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ update Subrace error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await removeSubrace(id);
    if (error) throw error;
    res.json({ message: "Subrace deleted successfully" });
  } catch (err) {
    console.error("❌ remove Subrace error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
