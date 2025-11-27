// routes/foundryLootRoutes.js
import express from "express";
import multer from "multer";
import {
  importFoundryLoots,
  importFoundryLootsFromFiles,
  listFoundryLootsHandler,
  getFoundryLootHandler,
  updateFoundryLootFormatHandler,
  deleteFoundryLootHandler,
  exportFoundryLootHandler,
} from "../controllers/foundryLootController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryLoots);
router.post("/import-files", upload.array("files"), importFoundryLootsFromFiles);

router.get("/", listFoundryLootsHandler);
router.get("/:id", getFoundryLootHandler);
router.put("/:id/format", updateFoundryLootFormatHandler);
router.delete("/:id", deleteFoundryLootHandler);
router.get("/:id/export", exportFoundryLootHandler);

export default router;
