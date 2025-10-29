import fs from "fs";
import path from "path";
import {
  createCharacter,
  getAllCharacters,
  getCharacterById,
  updateCharacter,
  deleteCharacter,
  getCharactersByUserId,
  getCharactersByUserIdTrash,
  markExpiredTrashCharactersAsDeleted,
  getCharacterByPublicId,
  getCharacterByPrivateId,
  updateCharacterByPrivateId,
} from "../models/characterModel.js";
import { Blob } from "buffer";

export const createCharacterHandler = async (req, res) => {
  const characterData = { ...req.body, user_id: req.userId };
  const { data, error } = await createCharacter(characterData);
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

export const saveCharacterHandler = async (req, res) => {
  try {
    console.log("📥 [IGNITE] SaveCharacter invoked (cookie-based)");

    // --- Parse body utama ---
    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const publicId = parsed.public_id;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    // --- Normalisasi UUID field kosong ---
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

    // --- Upload helper (pakai cookie token) ---
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
        console.log(formData);

        const token =
          req.cookies?.ignite_access_token ||
          req.user?.jwt?.token ||
          req.headers.authorization?.split(" ")[1] ||
          null;
        console.log(token);
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

    // --- Upload file media (jika ada) ---
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

    // --- Bersihkan field tidak relevan ---
    delete parsed.creator_email;
    delete parsed.creator_name;
    delete parsed.usedSkillPoints;
    delete parsed.art;
    delete parsed.token_art;
    delete parsed.height_unit;
    delete parsed.weight_unit;

    // --- Ambil user dari middleware verifyUserIgnite ---
    const userId = req.user?.id || null;
    const username = req.user?.username || "Unknown User";

    // --- Buat objek baru untuk insert ke Supabase ---
    const newCharacter = {
      ...parsed,
      user_id: userId,
      creator_name: username,
      rotation_stamp: parseFloat((Math.random() * 60 - 30).toFixed(1)),
      rotation_sticker: parseFloat((Math.random() * 60 - 30).toFixed(1)),
      stamp_type: Math.floor(Math.random() * 40) + 1,
      record_status: "active",
      deleted_at: null,
      art_image: artPath,
      token_image: tokenArtPath,
      main_theme_ogg: mainThemePath,
      combat_theme_ogg: combatThemePath,
    };

    // --- Simpan ke database ---
    const { data: created, error } = await createCharacter(newCharacter);
    if (error) {
      console.error("❌ Supabase insert error:", error.message);
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, character: created });
  } catch (err) {
    console.error("💥 saveCharacterHandler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCharactersHandler = async (req, res) => {
  const { data, error } = await getAllCharacters();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

export const getCharactersUserHandler = async (req, res) => {
  const { data, error } = await getCharactersByUserId(req.userId);
  if (error) return res.status(400).json({ error: error.message });
  const activeCharacters = data.filter(
    (character) => character.record_status === "active"
  );

  res.json(activeCharacters);
};

export const getCharactersUserTrash = async (req, res) => {
  const { data, error } = await getCharactersByUserIdTrash(req.userId);
  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};

export const getCharacterHandler = async (req, res) => {
  const { data, error } = await getCharacterById(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

export const updateCharacterByPrivateIdHandler = async (req, res) => {
  try {
    console.log("🛠 [IGNITE] UpdateCharacter by private_id invoked");

    const privateId = req.params.id;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    // --- Parse body JSON
    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    // --- Normalize UUID fields ---
    const uuidFields = [
      "race_id",
      "subrace_id",
      "background_id",
      "user_id",
      "incumbency_id",
    ];
    for (const field of uuidFields)
      if (parsed[field] === "") parsed[field] = null;

    // --- Fetch existing character ---
    const { data: existing, error: fetchError } = await getCharacterByPrivateId(
      privateId
    );
    if (fetchError || !existing)
      return res.status(404).json({ error: "Character not found" });

    // --- Upload helper ---
    const uploadToMedia = async (file, type) => {
      if (!file || !file.buffer) return null;

      try {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        const formData = new FormData();
        formData.append("path", "characters");
        formData.append("folder_name", existing.public_id);
        formData.append("file", blob, file.originalname);

        const token =
          req.cookies?.ignite_access_token ||
          req.user?.jwt?.token ||
          req.headers.authorization?.split(" ")[1] ||
          null;

        const resUpload = await fetch(`${MEDIA_URL}/upload`, {
          method: "POST",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
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

    // --- Upload file jika ada ---
    const files = req.files || {};
    const artPath =
      (req.files["art"] && (await uploadToMedia(files["art"][0], "art"))) ||
      existing.art_image;
    const tokenArtPath =
      (req.files["token_art"] &&
        (await uploadToMedia(files["token_art"][0], "token_art"))) ||
      existing.token_image;
    const mainThemePath =
      (req.files["main_theme_ogg"] &&
        (await uploadToMedia(files["main_theme_ogg"][0], "main_theme"))) ||
      existing.main_theme_ogg;
    const combatThemePath =
      (req.files["combat_theme_ogg"] &&
        (await uploadToMedia(files["combat_theme_ogg"][0], "combat_theme"))) ||
      existing.combat_theme_ogg;

    // --- Cleanup fields ---
    [
      "creator_email",
      "creator_name",
      "usedSkillPoints",
      "art",
      "token_art",
      "height_unit",
      "weight_unit",
    ].forEach((f) => delete parsed[f]);

    // --- Build updated data ---
    const updatedData = {
      ...existing,
      ...parsed,
      art_image: artPath,
      token_image: tokenArtPath,
      main_theme_ogg: mainThemePath,
      combat_theme_ogg: combatThemePath,
      updated_at: new Date().toISOString(),
    };

    // --- Update ke database ---
    const { data, error } = await updateCharacterByPrivateId(
      privateId,
      updatedData
    );
    if (error) return res.status(400).json({ error: error.message });

    console.log("✅ Character updated:", data);
    res.status(200).json(data);
  } catch (err) {
    console.error("💥 updateCharacterByPrivateIdHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const moveCharacterToTrash = async (req, res) => {
  const { id } = req.params;

  try {
    const updateData = {
      record_status: "trash",
      deleted_at: new Date().toISOString(),
    };

    const { data, error } = await updateCharacter(id, updateData);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Character moved to trash successfully",
      character: data[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const restoreCharacterFromTrash = async (req, res) => {
  const { id } = req.params;

  try {
    const updateData = {
      record_status: "active",
      deleted_at: null,
    };

    const { data, error } = await updateCharacter(id, updateData);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Character restore successfully",
      character: data[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteExpiredTrashCharacters = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: "User ID not found" });

    const { data, error } = await markExpiredTrashCharactersAsDeleted(userId);

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: "Expired trash characters deleted successfully",
      characters: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCharacterHandler = async (req, res) => {
  const { error } = await deleteCharacter(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Character deleted" });
};

export const getCharacterByPublicIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getCharacterByPublicId(id);

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Character not found" });

    res.status(200).json({
      success: true,
      message: "Character fetched successfully by public ID",
      data: data,
    });
  } catch (err) {
    console.error("💥 getCharacterByPublicIdHandler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCharacterByPrivateIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getCharacterByPrivateId(id);

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Character not found" });

    // ✅ optional: keamanan, hanya pemilik bisa akses
    if (req.user?.id && data.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to view this character",
      });
    }

    res.status(200).json({
      success: true,
      message: "Character fetched successfully by private ID",
      data: data,
    });
  } catch (err) {
    console.error("💥 getCharacterByPrivateIdHandler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
