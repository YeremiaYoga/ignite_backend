// controllers/traitModifierController.js
import slugify from "slugify";
import {
  getAllTraitModifiers,
  getTraitModifierById,
  createTraitModifier,
  updateTraitModifier,
  deleteTraitModifier,
  addSubtypeToModifier,
  updateSubtypeInModifier,
  removeSubtypeFromModifier,
} from "../models/traitModifierModel.js";

/* ======================================================
   🧩 MAIN TRAIT MODIFIER CRUD
====================================================== */

export const listTraitModifiers = async (req, res) => {
  const { data, error } = await getAllTraitModifiers();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

export const getTraitModifier = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getTraitModifierById(id);
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
};

export const createTraitModifierCtrl = async (req, res) => {
  try {
    const { name, subtypes = [] } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const payload = {
      name,
      slug: slugify(name, { lower: true, strict: true }),
      subtypes: subtypes.map((s) => ({
        name: s.name,
        slug: slugify(s.name, { lower: true, strict: true }),
      })),
    };

    const { data, error } = await createTraitModifier(payload);
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateTraitModifierCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subtypes } = req.body;

    const payload = {
      ...(name && { name, slug: slugify(name, { lower: true, strict: true }) }),
      ...(subtypes && { subtypes }),
    };

    const { data, error } = await updateTraitModifier(id, payload);
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteTraitModifierCtrl = async (req, res) => {
  const { id } = req.params;
  const { error } = await deleteTraitModifier(id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
};

/* ======================================================
   🧩 SUBTYPE OPERATIONS
====================================================== */

// ➕ Tambah subtype ke modifier
export const addSubtypeCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Subtype name required" });

    const subtype = {
      name,
      slug: slugify(name, { lower: true, strict: true }),
    };

    const { data, error } = await addSubtypeToModifier(id, subtype);
    if (error) throw error;

    res.json({ success: true, message: "Subtype added", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update subtype by slug
export const updateSubtypeCtrl = async (req, res) => {
  try {
    const { id, slug } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Subtype name required" });

    const newSubtype = {
      name,
      slug: slugify(name, { lower: true, strict: true }),
    };

    const { data, error } = await updateSubtypeInModifier(id, slug, newSubtype);
    if (error) throw error;

    res.json({ success: true, message: "Subtype updated", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ Hapus subtype by slug
export const removeSubtypeCtrl = async (req, res) => {
  try {
    const { id, slug } = req.params;
    const { data, error } = await removeSubtypeFromModifier(id, slug);
    if (error) throw error;

    res.json({ success: true, message: "Subtype deleted", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
