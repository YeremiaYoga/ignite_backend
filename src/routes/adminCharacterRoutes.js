import express from "express";
import multer from "multer";
import {
  saveCharacterAdminHandler,
  getCharactersAdminHandler,
  getCharacterAdminHandler,
  updateCharacterAdminHandler,
  deleteCharacterAdminHandler,
} from "../controllers/characterControllerAdmin.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/save",
  verifyUserFullAuth,
  upload.fields([
    { name: "art", maxCount: 1 },
    { name: "token_art", maxCount: 1 },
    { name: "main_theme_ogg", maxCount: 1 },
    { name: "combat_theme_ogg", maxCount: 1 },
  ]),
  saveCharacterAdminHandler
);

router.put(
  "/:id",
  verifyUserFullAuth,
  upload.fields([
    { name: "art", maxCount: 1 },
    { name: "token_art", maxCount: 1 },
    { name: "main_theme_ogg", maxCount: 1 },
    { name: "combat_theme_ogg", maxCount: 1 },
  ]),
  updateCharacterAdminHandler
);

router.get("/", verifyUserFullAuth, getCharactersAdminHandler);
router.get("/:id", verifyUserFullAuth, getCharacterAdminHandler);
router.delete("/:id", verifyUserFullAuth, deleteCharacterAdminHandler);

export default router;
