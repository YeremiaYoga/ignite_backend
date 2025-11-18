import express from "express";
import multer from "multer";

import {
  listWorldsAdmin,
  getWorldAdmin,
  addWorldAdmin,
  editWorldAdmin,
  deleteWorldAdmin,
} from "../controllers/adminWorldController.js";

import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

// Multer (pakai memoryStorage)
const upload = multer({ storage: multer.memoryStorage() });

// ORDER PENTING: route yang lebih spesifik harus sebelum route dengan :id
router.get("/", verifyUserFullAuth, listWorldsAdmin);
router.get("/:id", verifyUserFullAuth, getWorldAdmin);

// CREATE WORLD
router.post(
  "/",
  verifyUserFullAuth,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 }, // ⬅️ sesuai frontend
  ]),
  addWorldAdmin
);

// UPDATE WORLD
router.put(
  "/:id",
  verifyUserFullAuth,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  editWorldAdmin
);

// DELETE
router.delete("/:id", verifyUserFullAuth, deleteWorldAdmin);

export default router;
