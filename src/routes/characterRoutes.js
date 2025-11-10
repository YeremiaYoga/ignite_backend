import express from "express";
import multer from "multer";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
import {
  createCharacterHandler,
  getCharactersHandler,
  getCharacterHandler,
  updateCharacterByPrivateIdHandler,
  deleteCharacterHandler,
  getCharactersUserHandler,
  saveCharacterHandler,
  getCharactersUserTrash,
  moveCharacterToTrash,
  restoreCharacterFromTrash,
  deleteExpiredTrashCharacters,
  getCharacterByPublicIdHandler,
  getCharacterByPrivateIdHandler,
  getAllCharactersUserHandler
} from "../controllers/characterController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🧩 CREATE
router.post("/", createCharacterHandler);

// 🧩 SAVE / UPDATE
router.post(
  "/save",
  upload.fields([
    { name: "art", maxCount: 1 },
    { name: "token_art", maxCount: 1 },
    { name: "main_theme_ogg", maxCount: 1 },
    { name: "combat_theme_ogg", maxCount: 1 },
  ]),
  verifyUserIgnite,
  saveCharacterHandler
);

// 🧩 GET ALL CHARACTERS (ADMIN)
router.get("/", getCharactersHandler);

// 🧩 USER-BASED ENDPOINTS
router.get("/user/all", verifyUserIgnite, getAllCharactersUserHandler);
router.get("/user", verifyUserIgnite, getCharactersUserHandler);
router.get("/trash", verifyUserIgnite, getCharactersUserTrash);
router.get("/trash/expired", verifyUserIgnite, deleteExpiredTrashCharacters);

// 🧩 PUBLIC & PRIVATE ACCESS (more specific routes FIRST)
router.get("/public/:id", getCharacterByPublicIdHandler);
router.get("/private/:id", verifyUserIgnite, getCharacterByPrivateIdHandler);

// 🧩 STATUS MANAGEMENT
router.put("/:id/trash", moveCharacterToTrash);
router.put("/:id/restore", restoreCharacterFromTrash);

// 🧩 GENERIC BY ID (must always be LAST)
router.get("/:id", getCharacterHandler);
router.put(
  "/:id",
  verifyUserIgnite,
  upload.fields([
    { name: "art", maxCount: 1 },
    { name: "token_art", maxCount: 1 },
    { name: "main_theme_ogg", maxCount: 1 },
    { name: "combat_theme_ogg", maxCount: 1 },
  ]),
  updateCharacterByPrivateIdHandler
);
router.delete("/:id", deleteCharacterHandler);

export default router;
