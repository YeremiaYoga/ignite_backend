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
  getAllCharactersByUserId,
} from "../models/characterModel.js";
import { Blob } from "buffer";
import supabase from "../utils/db.js";

export const createCharacterHandler = async (req, res) => {
  const characterData = { ...req.body, user_id: req.userId };
  const { data, error } = await createCharacter(characterData);
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

export const saveCharacterHandler = async (req, res) => {
  try {
    console.log("📥 [IGNITE] SaveCharacter invoked (cookie-based)");

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const publicId = parsed.public_id;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    const uuidFields = [
      "race_id",
      "subrace_id",
      "background_id",
      "user_id",
      "incumbency_id",
    ];
    for (const field of uuidFields)
      if (parsed[field] === "") parsed[field] = null;

    const userId = req.user?.id || null;
    const username = req.user?.username || "Unknown User";

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: user not found" });
    }
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, character_limit, tier")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("❌ User fetch error:", userError?.message);
      return res.status(400).json({ error: "User not found" });
    }

    const { count, error: countError } = await supabase
      .from("characters")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("❌ Count error:", countError.message);
      return res.status(500).json({ error: "Failed to check character count" });
    }

    console.log(
      `👤 User ${userId} has ${count} / ${user.character_limit} characters`
    );

    if (count >= user.character_limit) {
      return res.status(403).json({
        error: `Character limit reached (${user.character_limit}). Upgrade your plan to create more.`,
        tier: user.tier,
      });
    }

    const uploadToMedia = async (file, type) => {
      if (!file || !file.buffer) return null;
      try {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        const formData = new FormData();
        formData.append("path", "characters");
        formData.append("folder_name", publicId);
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

    [
      "creator_email",
      "creator_name",
      "usedSkillPoints",
      "art",
      "token_art",
      "height_unit",
      "weight_unit",
    ].forEach((f) => delete parsed[f]);

    if (!parsed.name || parsed.name.trim() === "") {
      parsed.name = "Hero Without A Name";
    }

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

export const getAllCharactersUserHandler = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await getAllCharactersByUserId(userId);
    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json(data);
  } catch (err) {
    console.error("💥 getAllCharactersUserHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getCharactersUserHandler = async (req, res) => {
  const { data, error } = await getCharactersByUserId(req.userId);

  if (error) return res.status(400).json({ error: error.message });

  const validCharacters = data.filter(
    (character) => character && character.name && character.name.trim() !== ""
  );

  res.json(validCharacters);
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

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const uuidFields = [
      "race_id",
      "subrace_id",
      "background_id",
      "user_id",
      "incumbency_id",
    ];
    for (const field of uuidFields)
      if (parsed[field] === "") parsed[field] = null;

    const { data: existing, error: fetchError } = await getCharacterByPrivateId(
      privateId
    );
    if (fetchError || !existing)
      return res.status(404).json({ error: "Character not found" });

    const requesterId =
      req.user?.id || req.user?.user_id || req.userId || parsed.user_id || null;

    if (!requesterId) {
      return res
        .status(401)
        .json({ error: "Unauthorized — missing user identification" });
    }

    if (existing.user_id !== requesterId) {
      console.warn(
        `🚫 Unauthorized update attempt: user ${requesterId} tried to modify ${existing.user_id}`
      );
      return res.status(403).json({
        error:
          "Forbidden — you are not the owner of this character and cannot modify it.",
      });
    }

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

    if (!parsed.name || parsed.name.trim() === "") {
      parsed.name = "Hero Without A Name";
    }

    const updatedData = {
      ...existing,
      ...parsed,
      public_id: existing.public_id,
      private_id: existing.private_id,
      art_image: artPath,
      token_image: tokenArtPath,
      main_theme_ogg: mainThemePath,
      combat_theme_ogg: combatThemePath,
      updated_at: new Date().toISOString(),
    };

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
