import {
  getAllTraits,
  getTraitById,
  createTrait,
  updateTrait,
  deleteTrait,
} from "../models/traitModel.js";

// 🧾 Get all traits
export const getTraitsAdmin = async (req, res) => {
  try {
    const { data, error } = await getAllTraits();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getTraitsAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get single trait
export const getTraitAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getTraitById(id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ➕ Create new trait
export const addTraitAdmin = async (req, res) => {
  try {
    const body = req.body;
    const { data, error } = await createTrait({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "_"),
      display_order: body.display_order || 0,
      description: body.description || "",
      has_options: body.has_options ?? false,
      options: body.options || [],
      scope: body.scope || "generic",
    });
    if (error) throw error;
    res.status(201).json({ message: "✅ Trait created successfully", data });
  } catch (err) {
    console.error("❌ addTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update trait
export const editTraitAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const { data, error } = await updateTrait(id, {
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "_"),
      display_order: body.display_order || 0,
      description: body.description || "",
      has_options: body.has_options ?? false,
      options: body.options || [],
      scope: body.scope || "generic",
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    res.json({ message: "✅ Trait updated successfully", data });
  } catch (err) {
    console.error("❌ editTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ❌ Delete trait
export const deleteTraitAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await deleteTrait(id);
    if (error) throw error;
    res.json({ message: "🗑️ Trait deleted successfully" });
  } catch (err) {
    console.error("❌ deleteTraitAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};
