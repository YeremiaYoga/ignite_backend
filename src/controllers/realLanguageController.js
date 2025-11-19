import {
  getAllRealLanguages,
  getRealLanguageById,
  createRealLanguage,
  updateRealLanguage,
  deleteRealLanguage,
} from "../models/realLanguageModel.js";

// 📄 GET /real-languages
export const listRealLanguages = async (req, res) => {
  try {
    const { data, error } = await getAllRealLanguages();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ listRealLanguages:", err);
    res.status(500).json({ message: "Failed to list real languages" });
  }
};

// 🔍 GET /real-languages/:id
export const getRealLanguage = async (req, res) => {
  try {
    const { data, error } = await getRealLanguageById(req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ getRealLanguage:", err);
    res.status(404).json({ message: "Language not found" });
  }
};

// ➕ POST /real-languages
export const createRealLanguageCtrl = async (req, res) => {
  try {
    const { data, error } = await createRealLanguage(req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ createRealLanguageCtrl:", err);
    res.status(400).json({ message: "Failed to create real language" });
  }
};

// ✏️ PUT /real-languages/:id
export const updateRealLanguageCtrl = async (req, res) => {
  try {
    const { data, error } = await updateRealLanguage(req.params.id, req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ updateRealLanguageCtrl:", err);
    res.status(400).json({ message: "Failed to update real language" });
  }
};

// ❌ DELETE /real-languages/:id
export const deleteRealLanguageCtrl = async (req, res) => {
  try {
    const { error } = await deleteRealLanguage(req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("❌ deleteRealLanguageCtrl:", err);
    res.status(400).json({ message: "Failed to delete real language" });
  }
};
