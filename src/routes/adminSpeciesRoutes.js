import express from "express";
import multer from "multer";
import {
  addSpeciesAdmin,
  fetchAllSpeciesAdmin,
  fetchSpeciesByIdAdmin,
  editSpeciesAdmin,
  removeSpeciesAdmin,
} from "../controllers/adminSpeciesController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

// Gunakan memoryStorage supaya file bisa dikirim sebagai buffer
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Semua routes admin species
router.get("/", verifyUserFullAuth, fetchAllSpeciesAdmin);
router.get("/:id", verifyUserFullAuth, fetchSpeciesByIdAdmin);

// ✅ Gunakan upload.fields() untuk membaca multipart/form-data
router.post(
  "/",
  verifyUserFullAuth,
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "main_img", maxCount: 1 },
  ]),
  addSpeciesAdmin
);

router.put(
  "/:id",
  verifyUserFullAuth,
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "main_img", maxCount: 1 },
  ]),
  editSpeciesAdmin
);

router.delete("/:id", verifyUserFullAuth, removeSpeciesAdmin);

export default router;
