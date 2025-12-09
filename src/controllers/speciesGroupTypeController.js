import {
  getAllGroupTypes,
  getGroupTypeById,
  createGroupType,
  updateGroupType,
  deleteGroupType,
} from "../models/speciesGroupTypeModel.js";

export const fetchAllGroupTypes = async (req, res) => {
  try {
    const { data, error } = await getAllGroupTypes();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ fetchAllGroupTypes error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const addGroupType = async (req, res) => {
  try {
    const parsed = req.body;
    if (!parsed.name)
      return res.status(400).json({ error: "Missing field: name" });

    const newGroup = {
      ...parsed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await createGroupType(newGroup);
    if (error) throw error;
    res
      .status(201)
      .json({ success: true, message: "✅ Group type created", data });
  } catch (err) {
    console.error("💥 addGroupType error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const editGroupType = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = req.body;

    const updated = {
      ...parsed,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await updateGroupType(id, updated);
    if (error) throw error;
    res.json({ success: true, message: "✅ Group type updated", data });
  } catch (err) {
    console.error("❌ editGroupType error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const removeGroupType = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await deleteGroupType(id);
    if (error) throw error;
    res.json({ success: true, message: "✅ Group type deleted" });
  } catch (err) {
    console.error("❌ removeGroupType error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
