// routes/foundryFeatureRoutes.js
import express from "express";
import {
  importFoundryFeatures,
  listFoundryFeaturesHandler,
  getFoundryFeatureHandler,
  updateFoundryFeatureFormatHandler,
  deleteFoundryFeatureHandler,
  exportFoundryFeatureHandler,
} from "../controllers/foundryFeatureController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryFeatures);
router.get("/", listFoundryFeaturesHandler);
router.get("/:id", getFoundryFeatureHandler);
router.put("/:id/format", updateFoundryFeatureFormatHandler);
router.delete("/:id", deleteFoundryFeatureHandler);
router.get("/:id/export", exportFoundryFeatureHandler);

export default router;
