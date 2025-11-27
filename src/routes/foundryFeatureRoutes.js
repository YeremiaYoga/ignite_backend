// routes/foundryFeatureRoutes.js
import express from "express";
import multer from "multer";
import {
  importFoundryFeatures,
  importFoundryFeaturesFromFiles,
  listFoundryFeaturesHandler,
  getFoundryFeatureHandler,
  updateFoundryFeatureFormatHandler,
  deleteFoundryFeatureHandler,
  exportFoundryFeatureHandler,
} from "../controllers/foundryFeatureController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryFeatures);
router.post(
  "/import-files",
  upload.array("files"),
  importFoundryFeaturesFromFiles
);

router.get("/", listFoundryFeaturesHandler);
router.get("/:id", getFoundryFeatureHandler);
router.put("/:id/format", updateFoundryFeatureFormatHandler);
router.delete("/:id", deleteFoundryFeatureHandler);
router.get("/:id/export", exportFoundryFeatureHandler);

export default router;
