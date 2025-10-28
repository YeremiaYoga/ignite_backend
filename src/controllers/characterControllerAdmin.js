import fs from "fs";
import path from "path";
import {
  createCharacter,
  getAllCharacters,
  getCharacterById,
  updateCharacter,
  deleteCharacter,
} from "../models/characterModel.js";
import { Blob } from "buffer";

export const saveCharacterAdminHandler = async (req, res) => {
  try {
    console.log("📥 [ADMIN] SaveCharacter invoked");
    console.log("➡️ Headers:", req.headers);
    console.log("➡️ Files:", req.files);
    console.log("➡️ User:", req.user);

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const publicId = parsed.public_id || "admin_upload";
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    // --- UUID null-safe ---
    const uuidFields = [
      "race_id",
      "subrace_id",
      "background_id",
      "user_id",
      "incumbency_id",
    ];
    for (const field of uuidFields) {
      if (parsed[field] === "") parsed[field] = null;
    }

    // --- Helper upload (sama gaya-nya kayak versi user) ---
    const uploadToMedia = async (file, type) => {
      if (!file || !file.buffer) {
        console.log(`⚠️ Skip ${type}: tidak ada file`);
        return null;
      }

      try {
        const blob = new Blob([file.buffer], { type: file.mimetype });

        const formData = new FormData();
        formData.append("path", "characters");
        formData.append("folder_name", publicId);
        formData.append("file", blob, file.originalname);

        // 🟢 ambil token dari Authorization (karena admin pakai localStorage)
        const token = req.headers.authorization?.split(" ")[1] || null;

        const resUpload = await fetch(`${MEDIA_URL}/upload`, {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: formData,
        });

        if (!resUpload.ok) {
          const msg = await resUpload.text();
          console.error(`❌ Upload ${type} gagal:`, msg);
          return null;
        }

        const result = await resUpload.json();
        const fileUrl =
          result.fullUrl ||
          result.data?.fullUrl ||
          result.url ||
          result.data?.url;
        console.log(`✅ ${type} uploaded:`, fileUrl);
        return fileUrl;
      } catch (err) {
        console.error(`💥 Upload ${type} error:`, err);
        return null;
      }
    };

    // --- Upload semua file opsional ---
    let artPath = null;
    let tokenArtPath = null;
    let mainThemePath = null;
    let combatThemePath = null;

    if (req.files) {
      artPath = await uploadToMedia(req.files["art"]?.[0], "art");
      tokenArtPath = await uploadToMedia(
        req.files["token_art"]?.[0],
        "token_art"
      );
      mainThemePath = await uploadToMedia(
        req.files["main_theme_ogg"]?.[0],
        "main_theme"
      );
      combatThemePath = await uploadToMedia(
        req.files["combat_theme_ogg"]?.[0],
        "combat_theme"
      );
    }

    // --- Bersihkan data tidak penting ---
    delete parsed.creator_email;
    delete parsed.creator_name;
    delete parsed.usedSkillPoints;
    delete parsed.art;
    delete parsed.token_art;
    delete parsed.height_unit;
    delete parsed.weight_unit;

    // --- Role Check ---
    if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    const adminName = req.user?.username || "Admin Panel";
    const userId = parsed.user_id || req.user?.id || null;
    // --- Compose final data ---
    const newCharacter = {
      ...parsed,
      rotation_stamp: parseFloat((Math.random() * 60 - 30).toFixed(1)),
      rotation_sticker: parseFloat((Math.random() * 60 - 30).toFixed(1)),
      stamp_type: Math.floor(Math.random() * 40) + 1,
      record_status: "active",
      deleted_at: null,
      user_id: userId || null,
      creator_name: adminName,
      art_image: artPath,
      token_image: tokenArtPath,
      main_theme_ogg: mainThemePath,
      combat_theme_ogg: combatThemePath,
    };

    const { data: created, error } = await createCharacter(newCharacter);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, character: created });
  } catch (err) {
    console.error("💥 saveCharacterAdminHandler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 🔎 GET ALL CHARACTERS (ADMIN)
 */
export const getCharactersAdminHandler = async (req, res) => {
  const { data, error } = await getAllCharacters();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

/**
 * 🔍 GET CHARACTER BY ID (ADMIN)
 */
export const getCharacterAdminHandler = async (req, res) => {
  const { data, error } = await getCharacterById(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

/**
 * ✏️ UPDATE CHARACTER (ADMIN)
 */
export const updateCharacterAdminHandler = async (req, res) => {
  try {
    console.log("🛠️ [ADMIN] UpdateCharacter invoked");
    console.log("➡️ Headers:", req.headers);
    console.log("➡️ Files:", req.files);
    console.log("➡️ User:", req.user);

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const token =
      req.headers.authorization?.split(" ")[1] || req.user?.jwt?.token || null;

    // === Ambil karakter lama ===
    const { data: existing, error: fetchError } = await getCharacterById(req.params.id);
    if (fetchError || !existing)
      return res.status(404).json({ error: "Character not found" });

    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    // === Upload helper ===
    const uploadToMedia = async (file, type, folderName, token) => {
      if (!file || !file.buffer) return null;
      try {
        const blob = new Blob([file.buffer], { type: file.mimetype });

        const formData = new FormData();
        formData.append("path", "characters");
        formData.append("folder_name", folderName);
        formData.append("file", blob, file.originalname);

        const resUpload = await fetch(`${MEDIA_URL}/upload`, {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: formData,
        });

        if (!resUpload.ok) {
          const msg = await resUpload.text();
          console.error(`❌ Upload ${type} gagal:`, msg);
          return null;
        }

        const result = await resUpload.json();
        const fileUrl =
          result.fullUrl || result.data?.fullUrl || result.url || result.data?.url;
        console.log(`✅ ${type} uploaded:`, fileUrl);
        return fileUrl;
      } catch (err) {
        console.error(`💥 Upload ${type} error:`, err);
        return null;
      }
    };

    // === Upload assets jika ada ===
    let artPath = existing.art_image;
    let tokenArtPath = existing.token_image;
    let mainThemePath = existing.main_theme_ogg;
    let combatThemePath = existing.combat_theme_ogg;

    if (req.files) {
      if (req.files["art"]?.[0])
        artPath = await uploadToMedia(req.files["art"][0], "art", existing.public_id, token);
      if (req.files["token_art"]?.[0])
        tokenArtPath = await uploadToMedia(req.files["token_art"][0], "token_art", existing.public_id, token);
      if (req.files["main_theme_ogg"]?.[0])
        mainThemePath = await uploadToMedia(req.files["main_theme_ogg"][0], "main_theme", existing.public_id, token);
      if (req.files["combat_theme_ogg"]?.[0])
        combatThemePath = await uploadToMedia(req.files["combat_theme_ogg"][0], "combat_theme", existing.public_id, token);
    }

    // === Bersihkan data tidak relevan ===
    delete parsed.creator_email;
    delete parsed.creator_name;
    delete parsed.usedSkillPoints;
    delete parsed.art;
    delete parsed.token_art;
    delete parsed.height_unit;
    delete parsed.weight_unit;

    // === Role Check ===
    if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    // === Tentukan user_id fallback ===
    const userId = parsed.user_id || req.userId || existing.user_id || null;

    // === Gabungkan data baru ===
    const updatedData = {
      ...existing,
      ...parsed,
      user_id: userId,
      art_image: artPath,
      token_image: tokenArtPath,
      main_theme_ogg: mainThemePath,
      combat_theme_ogg: combatThemePath,
      updated_at: new Date().toISOString(),
      creator_name: req.user?.username || existing.creator_name,
    };

    const { data, error } = await updateCharacter(req.params.id, updatedData);
    if (error) return res.status(400).json({ error: error.message });

    console.log("✅ Character updated:", data);
    res.json({ success: true, character: data });
  } catch (err) {
    console.error("💥 updateCharacterAdminHandler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


/**
 * 🗑️ DELETE CHARACTER (ADMIN)
 */
export const deleteCharacterAdminHandler = async (req, res) => {
  const { error } = await deleteCharacter(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Character deleted by admin" });
};
