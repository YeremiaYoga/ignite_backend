import express from "express";
import multer from "multer";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
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

// ✅ gunakan memory storage agar file langsung bisa dikirim ke Media API
const storage = multer.memoryStorage();
const upload = multer({ storage });

// === ROUTES ===
router.post("/", createCharacterHandler);

router.post(
  "/save",
  verifyUserIgnite,
  upload.fields([
    { name: "art", maxCount: 1 },
    { name: "token_art", maxCount: 1 },
    { name: "main_theme_ogg", maxCount: 1 },
    { name: "combat_theme_ogg", maxCount: 1 },
  ]),
  saveCharacterHandler
);


router.get("/", getCharactersHandler);
router.get("/user", verifyUserIgnite, getCharactersUserHandler);
router.get("/trash", getCharactersUserTrash);
router.put("/:id/trash", moveCharacterToTrash);
router.put("/:id/restore", restoreCharacterFromTrash);
router.get("/trash/expired", deleteExpiredTrashCharacters);
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
  updateCharacterHandler
);
router.delete("/:id", deleteCharacterHandler);

export default router;
