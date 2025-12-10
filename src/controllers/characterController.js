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
import { deleteMediaFile } from "../utils/deleteMediaFile.js";
import { uploadToMedia } from "../utils/uploadToMedia.js";

const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB

// ====== Helper: validasi YouTube URL (youtu.be / youtube.com) ======
function isValidYouTubeUrl(url) {
  if (!url) return true; // kosong dianggap valid (tidak diisi)

  let clean = String(url).trim();
  if (!clean) return true;

  // kadang dari chat ada ">"
  if (clean.endsWith(">")) {
    clean = clean.slice(0, -1);
  }

  try {
    const u = new URL(clean);

    // youtu.be/VIDEO_ID
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return !!id;
    }

    // youtube.com/watch?v=VIDEO_ID
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return !!id;
    }

    // host lain -> tidak valid
    return false;
  } catch (err) {
    return false;
  }
}

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

    // ✅ Validasi YouTube link
    if (parsed.main_theme && !isValidYouTubeUrl(parsed.main_theme)) {
      return res.status(400).json({
        error:
          "Invalid main_theme: must be a valid YouTube link (youtu.be or youtube.com/watch?v=...).",
      });
    }

    if (parsed.combat_theme && !isValidYouTubeUrl(parsed.combat_theme)) {
      return res.status(400).json({
        error:
          "Invalid combat_theme: must be a valid YouTube link (youtu.be or youtube.com/watch?v=...).",
      });
    }

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

    // local uploadToMedia (shadowing util) – tetap dipakai
    const uploadToMediaLocal = async (file, type) => {
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
      const artFile = req.files["art"]?.[0];
      const tokenFile = req.files["token_art"]?.[0];

      // ✅ Validasi ukuran gambar max 3MB
      if (artFile && artFile.size > MAX_IMAGE_SIZE) {
        return res.status(400).json({
          error: "Art image is too large. Maximum size is 3MB.",
        });
      }

      if (tokenFile && tokenFile.size > MAX_IMAGE_SIZE) {
        return res.status(400).json({
          error: "Token art image is too large. Maximum size is 3MB.",
        });
      }

      artPath = await uploadToMediaLocal(artFile, "art");
      tokenArtPath = await uploadToMediaLocal(tokenFile, "token_art");

      // OGG tetap, tidak dihapus (hanya upload kalau ada)
      mainThemePath = await uploadToMediaLocal(
        req.files["main_theme_ogg"]?.[0],
        "main_theme"
      );
      combatThemePath = await uploadToMediaLocal(
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

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    // ✅ Validasi YouTube link (kalau ada di update)
    if (parsed.main_theme && !isValidYouTubeUrl(parsed.main_theme)) {
      return res.status(400).json({
        error:
          "Invalid main_theme: must be a valid YouTube link (youtu.be atau youtube.com/watch?v=...).",
      });
    }

    if (parsed.combat_theme && !isValidYouTubeUrl(parsed.combat_theme)) {
      return res.status(400).json({
        error:
          "Invalid combat_theme: must be a valid YouTube link (youtu.be atau youtube.com/watch?v=...).",
      });
    }

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

    // Ambil existing character
    const { data: existing, error: fetchError } = await getCharacterByPrivateId(
      privateId
    );
    if (fetchError || !existing) {
      console.warn("⚠️ Character not found for update:", privateId);
      return res.status(404).json({ error: "Character not found" });
    }

    // Cek owner
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

    // Ambil token sekali
    const token =
      req.cookies?.ignite_access_token ||
      req.user?.jwt?.token ||
      req.headers.authorization?.split(" ")[1] ||
      null;

    const files = req.files || {};

    // ✅ Validasi ukuran gambar max 3MB (kalau ada upload baru)
    const artFile = files["art"]?.[0];
    const tokenFile = files["token_art"]?.[0];

    if (artFile && artFile.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        error: "Art image is too large. Maximum size is 3MB.",
      });
    }

    if (tokenFile && tokenFile.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        error: "Token art image is too large. Maximum size is 3MB.",
      });
    }

    // Handle ART
    let artPath = existing.art_image;
    if (artFile) {
      const newUrl = await uploadToMedia({
        file: artFile,
        path: "characters",
        folderName: existing.public_id,
        token,
        mediaUrl: MEDIA_URL,
      });

      if (newUrl) {
        if (existing.art_image && existing.art_image !== newUrl) {
          await deleteMediaFile(existing.art_image, MEDIA_URL, token);
        }
        artPath = newUrl;
      }
    }

    // Handle TOKEN ART
    let tokenArtPath = existing.token_image;
    if (tokenFile) {
      const newUrl = await uploadToMedia({
        file: tokenFile,
        path: "characters",
        folderName: existing.public_id,
        token,
        mediaUrl: MEDIA_URL,
      });

      if (newUrl) {
        if (existing.token_image && existing.token_image !== newUrl) {
          await deleteMediaFile(existing.token_image, MEDIA_URL, token);
        }
        tokenArtPath = newUrl;
      }
    }

    // MAIN THEME OGG (tetap, tidak dihapus)
    let mainThemePath = existing.main_theme_ogg;
    if (files["main_theme_ogg"] && files["main_theme_ogg"][0]) {
      const newUrl = await uploadToMedia({
        file: files["main_theme_ogg"][0],
        path: "characters",
        folderName: existing.public_id,
        token,
        mediaUrl: MEDIA_URL,
      });

      if (newUrl) {
        if (existing.main_theme_ogg && existing.main_theme_ogg !== newUrl) {
          await deleteMediaFile(existing.main_theme_ogg, MEDIA_URL, token);
        }
        mainThemePath = newUrl;
      }
    }

    // COMBAT THEME OGG (tetap, tidak dihapus)
    let combatThemePath = existing.combat_theme_ogg;
    if (files["combat_theme_ogg"] && files["combat_theme_ogg"][0]) {
      const newUrl = await uploadToMedia({
        file: files["combat_theme_ogg"][0],
        path: "characters",
        folderName: existing.public_id,
        token,
        mediaUrl: MEDIA_URL,
      });

      if (newUrl) {
        if (existing.combat_theme_ogg && existing.combat_theme_ogg !== newUrl) {
          await deleteMediaFile(existing.combat_theme_ogg, MEDIA_URL, token);
        }
        combatThemePath = newUrl;
      }
    }

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
    if (error) {
      console.error("💥 updateCharacterByPrivateId DB error:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log("✅ Character updated:", data?.id, data?.name);
    return res.status(200).json(data);
  } catch (err) {
    console.error("💥 updateCharacterByPrivateIdHandler error:", err);
    return res.status(500).json({ error: err.message });
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
  try {
    const privateId = req.params.id;
    console.log("🗑️ [IGNITE] deleteCharacterHandler invoked:", privateId);

    const { data: existing, error: fetchError } = await getCharacterByPrivateId(
      privateId
    );
    if (fetchError || !existing) {
      console.warn("⚠️ Character not found for delete:", privateId);
      return res.status(404).json({ error: "Character not found" });
    }

    if (existing.user_id && req.user?.id && existing.user_id !== req.user.id) {
      console.warn(
        `🚫 Unauthorized delete attempt: user ${req.user.id} tried to delete character of ${existing.user_id}`
      );
      return res.status(403).json({
        error: "Forbidden — you are not the owner of this character.",
      });
    }

    const { error: deleteError } = await deleteCharacter(existing.id);
    if (deleteError) {
      console.error("💥 deleteCharacter DB error:", deleteError.message);
      return res.status(400).json({ error: deleteError.message });
    }

    if (existing.public_id) {
      const folderPath = `characters/${existing.public_id}`;

      try {
        const token =
          req.cookies?.ignite_access_token ||
          req.user?.jwt?.token ||
          req.headers.authorization?.split(" ")[1] ||
          null;

        const resp = await fetch(`${MEDIA_URL}/upload/folder`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ folder_path: folderPath }),
        });

        if (!resp.ok) {
          const msg = await resp.text();
          console.warn("⚠️ Failed to delete media folder:", folderPath, msg);
        } else {
          console.log("🧹 Media folder deleted:", folderPath);
        }
      } catch (err) {
        console.error("💥 Error calling media deleteFolder:", err);
      }
    } else {
      console.log("ℹ️ Character has no public_id, skip media folder delete");
    }

    return res.json({ message: "Character deleted" });
  } catch (err) {
    console.error("💥 deleteCharacterHandler error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  }
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
