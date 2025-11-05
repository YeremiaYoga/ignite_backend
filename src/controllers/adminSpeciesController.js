import {
  getAllSpecies,
  getSpeciesById,
  createSpecies,
  updateSpecies,
  deleteSpecies,
} from "../models/speciesModel.js";
import { uploadToMedia } from "../utils/uploadToMedia.js";

/**
 * ✅ GET all species (admin)
 */
export const fetchAllSpeciesAdmin = async (req, res) => {
  try {
    const { data, error } = await getAllSpecies();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ fetchAllSpeciesAdmin error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ GET one species by ID
 */
export const fetchSpeciesByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getSpeciesById(id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ fetchSpeciesByIdAdmin error:", err.message);
    res.status(404).json({ error: err.message });
  }
};

export const addSpeciesAdmin = async (req, res) => {
  try {
    console.log("📥 [ADMIN] addSpecies invoked");
    console.log("➡️ BODY:", req.body);
    console.log("➡️ FILES:", req.files);

    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;
    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    if (!parsed.name)
      return res.status(400).json({ error: "Missing required field: name" });

    // 🧩 Setup basic info
    const speciesName = parsed.name.replace(/\s+/g, "_").toLowerCase();
    const token = req.headers.authorization?.split(" ")[1] || null;

    // 🖼 Upload images if exist
    const imgUrl = await uploadToMedia({
      file: req.files?.["img"]?.[0],
      path: "species",
      folderName: speciesName,
      token,
    });

    const mainImgUrl = await uploadToMedia({
      file: req.files?.["main_img"]?.[0],
      path: "species",
      folderName: speciesName,
      token,
    });

    // 🧠 User info (auto from token or default)
    const userId = req.user?.id || null;
    const userName = req.user?.username || req.user?.email || "admin@ignite";

    // 🧱 Data to insert (strict by schema)
    const allowedFields = [
      "name",
      "icon",
      "img",
      "main_img",
      "homebrew",
      "public",
      "user_name",
      "source",
      "version",
      "group_type_name",
      "group_type_id",
      "short_description",
      "description",
      "traits",
      "subraces",
      "created_at",
      "updated_at",
      "user_id",
    ];

    const newSpecies = {
      ...parsed,
      img: imgUrl || parsed.img || null,
      main_img: mainImgUrl || parsed.main_img || null,
      homebrew: false,
      public: parsed.public === true || parsed.public === "true",
      user_id: userId,
      user_name: userName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 🧹 Remove extra fields not in schema
    const cleanData = Object.fromEntries(
      Object.entries(newSpecies).filter(([key]) => allowedFields.includes(key))
    );

    // 🧾 Insert to Supabase
    const { data, error } = await createSpecies(cleanData);
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "✅ Species created successfully",
      data,
    });
  } catch (err) {
    console.error("💥 addSpeciesAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * ✅ UPDATE species by ID
 */
export const editSpeciesAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    const existingRes = await getSpeciesById(id);
    if (existingRes.error || !existingRes.data)
      return res.status(404).json({ error: "Species not found" });
    const existing = existingRes.data;

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;
    const speciesName =
      parsed.name?.replace(/\s+/g, "_").toLowerCase() ||
      existing.name?.replace(/\s+/g, "_").toLowerCase() ||
      "unknown";

    const token = req.headers.authorization?.split(" ")[1] || null;

    // 🖼 Upload baru (kalau ada)
    const newImg = await uploadToMedia({
      file: req.files?.["img"]?.[0],
      path: "species",
      folderName: speciesName,
      token,
    });

    const newMainImg = await uploadToMedia({
      file: req.files?.["main_img"]?.[0],
      path: "species",
      folderName: speciesName,
      token,
    });

    const userId = req.user?.id || existing.user_id || null;
    const userName =
      req.user?.username || req.user?.email || existing.user_name || "admin";

    const updatedData = {
      ...existing,
      ...parsed,
      img: newImg || parsed.img || existing.img,
      main_img: newMainImg || parsed.main_img || existing.main_img,
      public: parsed.public === true || parsed.public === "true",
      user_id: userId,
      user_name: userName,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await updateSpecies(id, updatedData);
    if (error) throw error;

    res.json({
      success: true,
      message: "✅ Species updated successfully",
      data,
    });
  } catch (err) {
    console.error("❌ editSpeciesAdmin error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ DELETE species
 */
export const removeSpeciesAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await deleteSpecies(id);
    if (error) throw error;

    res.json({ success: true, message: "✅ Species deleted successfully" });
  } catch (err) {
    console.error("❌ removeSpeciesAdmin error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
