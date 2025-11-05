import {
  getAllDndSources,
  getDndSourceById,
  createDndSource,
  updateDndSource,
  deleteDndSource,
} from "../models/dndSourceModel.js";
import { uploadToMedia } from "../utils/uploadToMedia.js";

/**
 * ✅ Ambil semua D&D Sources
 */
export const fetchAllDndSources = async (req, res) => {
  try {
    const { data, error } = await getAllDndSources();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ fetchAllDndSources error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Tambah source baru
 */
export const addDndSource = async (req, res) => {
  try {
    const parsed = req.body;
    if (!parsed.name) return res.status(400).json({ error: "Missing field: name" });

    const token = req.headers.authorization?.split(" ")[1] || null;

    const iconUrl = await uploadToMedia({
      file: req.files?.["icon"]?.[0],
      path: "sources",
      folderName: parsed.name.replace(/\s+/g, "_").toLowerCase(),
      token,
    });

    const newSource = {
      ...parsed,
      icon: iconUrl || parsed.icon || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await createDndSource(newSource);
    if (error) throw error;

    res.status(201).json({ success: true, message: "✅ Source created", data });
  } catch (err) {
    console.error("💥 addDndSource error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Update Source
 */
export const editDndSource = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = req.body;

    const token = req.headers.authorization?.split(" ")[1] || null;
    const iconUrl = await uploadToMedia({
      file: req.files?.["icon"]?.[0],
      path: "sources",
      folderName: parsed.name || "unknown",
      token,
    });

    const updatedData = {
      ...parsed,
      icon: iconUrl || parsed.icon || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await updateDndSource(id, updatedData);
    if (error) throw error;

    res.json({ success: true, message: "✅ Source updated", data });
  } catch (err) {
    console.error("❌ editDndSource error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Delete Source
 */
export const removeDndSource = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await deleteDndSource(id);
    if (error) throw error;
    res.json({ success: true, message: "✅ Source deleted" });
  } catch (err) {
    console.error("❌ removeDndSource error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
