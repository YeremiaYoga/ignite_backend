// routes/foundryFeatureRoutes.js
import express from "express";
import multer from "multer";

import {
  importFoundryFeatures,
  importFoundryFeaturesFromFiles,
  listFoundryFeaturesHandler,
  getFoundryFeatureHandler,
  updateFoundryFeatureHandler,
  deleteFoundryFeatureHandler,
  exportFoundryFeatureHandler,
} from "../controllers/admin/foundryFeatureController.js";

import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer(); // memory storage

router.use(verifyUserFullAuth);

router.post("/import", importFoundryFeatures);

router.post(
  "/import-files",
  upload.array("files"),
  importFoundryFeaturesFromFiles
);

router.get("/", listFoundryFeaturesHandler);

router.get("/:id", getFoundryFeatureHandler);

// update bebas (misal edit favorites, requirements, dll)
router.put("/:id", updateFoundryFeatureHandler);

router.delete("/:id", deleteFoundryFeatureHandler);

router.get("/:id/export", exportFoundryFeatureHandler);

export default router;
