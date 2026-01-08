// controllers/modifierController.js
import slugify from "slugify";
import {
  getAllModifiers,
  getModifierById,
  createModifier,
  updateModifier,
  deleteModifier,
  addSubtype,
  updateSubtype,
  removeSubtype,
} from "../models/modifierModel.js";

/* ======================================================
   🧩 MAIN MODIFIER CRUD
====================================================== */

// GET /modifiers
export const listModifiers = async (req, res) => {
  const { data, error } = await getAllModifiers();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

// GET /modifiers/:id
export const getModifier = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getModifierById(id);
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
};

// POST /modifiers
export const createModifierCtrl = async (req, res) => {
  try {
    const {
      name,
      subtypes = [],
      public: isPublic = false,
      target_for = [], // ⬅️ langsung ambil dari body
    } = req.body;

    console.log("📥 BODY FROM CLIENT:", req.body);

    if (!name) return res.status(400).json({ error: "Name is required" });

    const formattedSubtypes = Array.isArray(subtypes)
      ? subtypes.map((s) => ({
          name: s.name,
          slug: slugify(s.name, { lower: true, strict: true }),
        }))
      : [];

    const payload = {
      name,
      slug: slugify(name, { lower: true, strict: true }),
      subtypes: formattedSubtypes,
      public: !!isPublic,
      target_for: Array.isArray(target_for) ? target_for : [], // ⬅️ pakai ini
    };

    console.log("📦 createModifierCtrl payload:", payload);

    const { data, error } = await createModifier(payload);
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ createModifierCtrl error:", err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /modifiers/:id
export const updateModifierCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subtypes,
      public: isPublic,
      target_for, // ⬅️ cukup ini
    } = req.body;

    console.log("📥 updateModifierCtrl body:", req.body);

    const payload = {
      ...(name && {
        name,
        slug: slugify(name, { lower: true, strict: true }),
      }),
      ...(subtypes && { subtypes }),
      ...(isPublic !== undefined && { public: !!isPublic }),
      ...(target_for !== undefined && {
        target_for: Array.isArray(target_for) ? target_for : [],
      }),
    };

    console.log("📦 updateModifierCtrl payload:", payload);

    const { data, error } = await updateModifier(id, payload);
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ updateModifierCtrl error:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /modifiers/:id
export const deleteModifierCtrl = async (req, res) => {
  const { id } = req.params;
  const { error } = await deleteModifier(id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
};


export const addSubtypeCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Subtype name required" });

    const subtype = {
      name,
      slug: slugify(name, { lower: true, strict: true }),
    };

    const { data, error } = await addSubtype(id, subtype);
    if (error) throw error;

    res.json({ success: true, message: "Subtype added", data });
  } catch (err) {
    console.error("❌ addSubtypeCtrl error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update subtype by slug
// PUT /modifiers/:id/subtypes/:slug
export const updateSubtypeCtrl = async (req, res) => {
  try {
    const { id, slug } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Subtype name required" });

    const newSubtype = {
      name,
      slug: slugify(name, { lower: true, strict: true }),
    };

    const { data, error } = await updateSubtype(id, slug, newSubtype);
    if (error) throw error;

    res.json({ success: true, message: "Subtype updated", data });
  } catch (err) {
    console.error("❌ updateSubtypeCtrl error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ❌ Hapus subtype by slug
// DELETE /modifiers/:id/subtypes/:slug
export const removeSubtypeCtrl = async (req, res) => {
  try {
    const { id, slug } = req.params;
    const { data, error } = await removeSubtype(id, slug);
    if (error) throw error;

    res.json({ success: true, message: "Subtype deleted", data });
  } catch (err) {
    console.error("❌ removeSubtypeCtrl error:", err);
    res.status(500).json({ error: err.message });
  }
};
