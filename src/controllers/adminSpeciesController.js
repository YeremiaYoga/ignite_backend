import {
  getAllSpecies,
  getSpeciesById,
  getSpeciesBySlug,
  createSpecies,
  updateSpecies,
  deleteSpecies,
} from "../models/speciesModel.js";
import { uploadToMedia } from "../utils/uploadToMedia.js";

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") 
    .replace(/^-+|-+$/g, ""); 


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


export const fetchSpeciesBySlugAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const { data, error } = await getSpeciesBySlug(slug);
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Species not found" });
    res.json(data);
  } catch (err) {
    console.error("❌ fetchSpeciesBySlugAdmin error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


export const addSpeciesAdmin = async (req, res) => {
  try {
    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    if (!parsed.name)
      return res.status(400).json({ error: "Missing required field: name" });

    const slug = parsed.slug || slugify(parsed.name);
    const token = req.headers.authorization?.split(" ")[1] || null;
    const speciesName = slug.replace(/-/g, "_");

    const iconUrl = await uploadToMedia({
      file: req.files?.["icon"]?.[0],
      path: "species",
      folderName: speciesName,
      token,
    });
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

    const userId = req.user?.id || null;
    const userName = req.user?.username || req.user?.email || "admin@ignite";

    const allowedFields = [
      "name",
      "slug",
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
      slug,
      icon: iconUrl || parsed.icon || null,
      img: imgUrl || parsed.img || null,
      main_img: mainImgUrl || parsed.main_img || null,
      homebrew: false,
      public: parsed.public === true || parsed.public === "true",
      user_id: userId,
      user_name: userName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const cleanData = Object.fromEntries(
      Object.entries(newSpecies).filter(([k]) => allowedFields.includes(k))
    );

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


export const editSpeciesAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRes = await getSpeciesById(id);
    if (existingRes.error || !existingRes.data)
      return res.status(404).json({ error: "Species not found" });

    const existing = existingRes.data;
    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const slug = parsed.slug || slugify(parsed.name || existing.name);
    const token = req.headers.authorization?.split(" ")[1] || null;
    const speciesName = slug.replace(/-/g, "_");

    const newIcon = await uploadToMedia({
      file: req.files?.["icon"]?.[0],
      path: "species",
      folderName: speciesName,
      token,
    });
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
      slug,
      icon: newIcon || parsed.icon || existing.icon,
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
