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
const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;
export const saveCharacterAdminHandler = async (req, res) => {
  try {
    console.log("📥 [ADMIN] SaveCharacter invoked");
    console.log("➡️ Headers:", req.headers);
    console.log("➡️ Files:", req.files);
    console.log("➡️ User:", req.user);

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const publicId = parsed.public_id || "admin_upload";

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

    delete parsed.creator_email;
    delete parsed.creator_name;
    delete parsed.usedSkillPoints;
    delete parsed.art;
    delete parsed.token_art;
    delete parsed.height_unit;
    delete parsed.weight_unit;

    // 🔐 Admin only
    if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    // 🔹 Samakan dengan Ignite: default nama
    if (!parsed.name || parsed.name.trim() === "") {
      parsed.name = "Hero Without A Name";
    }

    const adminName = req.user?.username || "Admin Panel";
    const userId = parsed.user_id || req.user?.id || null;

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

  res.json({ success: true, data });
};

export const getCharacterAdminHandler = async (req, res) => {
  const { data, error } = await getCharacterById(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Character not found" });

  res.json({ success: true, data });
};

/**
 * ✏️ UPDATE CHARACTER (ADMIN)
 */
export const updateCharacterAdminHandler = async (req, res) => {
  try {
    console.log("🛠️ [ADMIN] UpdateCharacter invoked");

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    if (req.user?.role !== "admin" && req.user?.role !== "superadmin")
      return res.status(403).json({ error: "Forbidden: Admin access only" });

    const token = req.headers.authorization?.split(" ")[1] || null;

    const { data: existing, error: fetchError } = await getCharacterById(
      req.params.id
    );
    if (fetchError || !existing)
      return res.status(404).json({ error: "Character not found" });

    const uploadToMedia = async (file, type) => {
      if (!file || !file.buffer) return null;
      try {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        const formData = new FormData();
        formData.append("path", "characters");
        formData.append("folder_name", existing.public_id);
        formData.append("file", blob, file.originalname);

        const resUpload = await fetch(`${MEDIA_URL}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!resUpload.ok) return null;

        const result = await resUpload.json();
        return (
          result.fullUrl ||
          result.data?.fullUrl ||
          result.url ||
          result.data?.url
        );
      } catch (_) {
        return null;
      }
    };

    // upload jika ada
    const files = req.files || {};
    const artPath =
      (files.art && (await uploadToMedia(files.art[0], "art"))) ||
      existing.art_image;

    const tokenArtPath =
      (files.token_art &&
        (await uploadToMedia(files.token_art[0], "token_art"))) ||
      existing.token_image;

    const mainThemePath =
      (files.main_theme_ogg &&
        (await uploadToMedia(files.main_theme_ogg[0], "main_theme"))) ||
      existing.main_theme_ogg;

    const combatThemePath =
      (files.combat_theme_ogg &&
        (await uploadToMedia(files.combat_theme_ogg[0], "combat_theme"))) ||
      existing.combat_theme_ogg;

    // hapus field tidak boleh disimpan
    [
      "creator_email",
      "creator_name",
      "usedSkillPoints",
      "art",
      "token_art",
      "height_unit",
      "weight_unit",
      "public_id",
      "private_id",
    ].forEach((f) => delete parsed[f]);

    if (!parsed.name || parsed.name.trim() === "")
      parsed.name = "Hero Without A Name";

    const updatedData = {
      ...existing,
      ...parsed,
      user_id: parsed.user_id || existing.user_id || null,
      art_image: artPath,
      token_image: tokenArtPath,
      main_theme_ogg: mainThemePath,
      combat_theme_ogg: combatThemePath,
      updated_at: new Date().toISOString(),
      creator_name: req.user?.username || existing.creator_name,
    };

    const { data, error } = await updateCharacter(req.params.id, updatedData);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, character: data });
  } catch (err) {
    console.error("💥 updateCharacterAdminHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteCharacterAdminHandler = async (req, res) => {
  try {
    const privateId = req.params.id;
    console.log("🗑️ [ADMIN] deleteCharacterAdmin invoked:", privateId);

    const { data: existing, error: fetchError } = await getCharacterById(
      privateId
    );
    if (fetchError || !existing)
      return res.status(404).json({ error: "Character not found" });

    // 1. Hapus record
    const { error: deleteError } = await deleteCharacter(privateId);
    if (deleteError)
      return res.status(400).json({ error: deleteError.message });

    // 2. Hapus folder media
    if (existing.public_id) {
      const folderPath = `characters/${existing.public_id}`;

      const token = req.headers.authorization?.split(" ")[1] || null;

      try {
        await fetch(`${MEDIA_URL}/upload/folder`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ folder_path: folderPath }),
        });

        console.log("🧹 Folder deleted:", folderPath);
      } catch (err) {
        console.warn("⚠️ Folder delete failed:", err.message);
      }
    }

    res.json({ message: "Character deleted by admin" });
  } catch (err) {
    console.error("💥 deleteCharacterAdminHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};
