// src/controllers/incumbencyController.js
import {
  getAllIncumbency,
  getIncumbencyById,
  createIncumbency,
  updateIncumbency,
  deleteIncumbency,
} from "../models/incumbencyModel.js";

export const getAll = async (req, res) => {
  const { data, error } = await getAllIncumbency();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const getById = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getIncumbencyById(id);
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
};

export const create = async (req, res) => {
  const { data, error } = await createIncumbency(req.body);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const update = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await updateIncumbency(id, req.body);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const remove = async (req, res) => {
  const { id } = req.params;
  const { error } = await deleteIncumbency(id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
