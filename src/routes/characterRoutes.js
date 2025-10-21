import express from "express";
import upload from "../middlewares/upload.js";
import {
  createCharacterHandler,
  getCharactersHandler,
  getCharacterHandler,
  updateCharacterHandler,
  deleteCharacterHandler,
  getCharactersUserHandler,
  saveCharacterHandler,
  getCharactersUserTrash,
  moveCharacterToTrash,
  restoreCharacterFromTrash,
  deleteExpiredTrashCharacters,
} from "../controllers/characterController.js";

const router = express.Router();

router.post("/", createCharacterHandler);
router.post(
  "/save",
  upload.fields([
    { name: "art", maxCount: 1 },
    { name: "token_art", maxCount: 1 },
    { name: "main_theme_ogg", maxCount: 1 },
    { name: "combat_theme_ogg", maxCount: 1 },
  ]),
  saveCharacterHandler
);

// router.post("/save", saveCharacterHandler);

router.get("/", getCharactersHandler);
router.get("/user", getCharactersUserHandler);
router.get("/trash", getCharactersUserTrash);
router.put("/:id/trash", moveCharacterToTrash);
router.put("/:id/restore", restoreCharacterFromTrash);
router.get("/trash/expired", deleteExpiredTrashCharacters);
router.get("/:id", getCharacterHandler);
router.put("/:id", updateCharacterHandler);
router.delete("/:id", deleteCharacterHandler);

export default router;
