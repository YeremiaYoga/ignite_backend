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

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", verifyUserFullAuth, fetchAllSpeciesAdmin);
router.get("/:id", verifyUserFullAuth, fetchSpeciesByIdAdmin);
router.get("/slug/:slug", verifyUserFullAuth, fetchSpeciesBySlugAdmin);
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

router.delete("/:id", verifyUserFullAuth, removeSpeciesAdmin);

export default router;
