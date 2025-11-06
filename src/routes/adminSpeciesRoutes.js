import express from "express";
import multer from "multer";
import {
  addSpeciesAdmin,
  fetchAllSpeciesAdmin,
  fetchSpeciesByIdAdmin,
  fetchSpeciesBySlugAdmin, // ✅ tambahan
  editSpeciesAdmin,
  removeSpeciesAdmin,
} from "../controllers/adminSpeciesController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

// Gunakan memoryStorage supaya file bisa dikirim sebagai buffer
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Semua species (admin)
router.get("/", verifyUserFullAuth, fetchAllSpeciesAdmin);

// ✅ Get species by ID
router.get("/:id", verifyUserFullAuth, fetchSpeciesByIdAdmin);

// ✅ Get species by SLUG (untuk halaman traits)
router.get("/slug/:slug", verifyUserFullAuth, fetchSpeciesBySlugAdmin);

// ✅ CREATE species (dengan icon, img, main_img)
router.post(
  "/",
  verifyUserFullAuth,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "img", maxCount: 1 },
    { name: "main_img", maxCount: 1 },
  ]),
  addSpeciesAdmin
);

// ✅ UPDATE species (dengan icon, img, main_img)
router.put(
  "/:id",
  verifyUserFullAuth,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "img", maxCount: 1 },
    { name: "main_img", maxCount: 1 },
  ]),
  editSpeciesAdmin
);

// ✅ DELETE species
router.delete("/:id", verifyUserFullAuth, removeSpeciesAdmin);

export default router;
