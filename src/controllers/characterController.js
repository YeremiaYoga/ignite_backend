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
} from "../models/characterModel.js";



export const createCharacterHandler = async (req, res) => {
  const characterData = { ...req.body, user_id: req.userId };
  const { data, error } = await createCharacter(characterData);
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

export const saveCharacterHandler = async (req, res) => {
  try {
    const { data } = req.body;
    const parsed = JSON.parse(data);

    delete parsed.creator_email;
    delete parsed.creator_name;
    delete parsed.usedSkillPoints;

    const characterName = parsed.name || "default";

    const baseDir = path.join(
      process.cwd(),
      "public/assets/characters",
      characterName
    );
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const saveFile = (file, fieldName) => {
      if (!file) return null;
      const ext = path.extname(file.originalname);
      const newPath = path.join(baseDir, `${fieldName}${ext}`);
      fs.renameSync(file.path, newPath);
      return `/assets/characters/${characterName}/${fieldName}${ext}`;
    };

    const artPath = saveFile(req.files["art"]?.[0], "art");
    const tokenArtPath = saveFile(req.files["token_art"]?.[0], "token_art");
    const mainThemePath = saveFile(
      req.files["main_theme_ogg"]?.[0],
      "main_theme"
    );
    const combatThemePath = saveFile(
      req.files["combat_theme_ogg"]?.[0],
      "combat_theme"
    );

    const mergedData = {
      ...parsed,
      rotation_stamp: parseFloat((Math.random() * 60 - 30).toFixed(1)),
      rotation_sticker: parseFloat((Math.random() * 60 - 30).toFixed(1)),
      stamp_type: Math.floor(Math.random() * 40) + 1,
      record_staus: "active",
      deleted_at: null,
    };

    const newCharacter = {
      ...mergedData,
      user_id: req.userId,
      art_image: artPath,
      token_image: tokenArtPath,
      main_theme_ogg: mainThemePath,
      combat_theme_ogg: combatThemePath,
    };

    const { data: created, error } = await createCharacter(newCharacter);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, character: created });
  } catch (err) {
    console.error(err);
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


export const updateCharacterHandler = async (req, res) => {
  const { data, error } = await updateCharacter(req.params.id, req.body);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
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
