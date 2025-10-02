import express from "express";
import upload from "../middlewares/upload.js";
import {
  createCharacterHandler,
  getCharactersHandler,
  getCharacterHandler,
  updateCharacterHandler,
  deleteCharacterHandler,
  getCharactersUserHandler,
  saveCharacterHandler, // <== tambahkan
} from "../controllers/characterController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.use(requireAuth);

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

router.get("/", getCharactersHandler);
router.get("/user", getCharactersUserHandler);
router.get("/:id", getCharacterHandler);
router.put("/:id", updateCharacterHandler);
router.delete("/:id", deleteCharacterHandler);

export default router;
