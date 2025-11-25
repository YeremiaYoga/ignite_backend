// routes/foundryLootRoutes.js
import express from "express";
import {
  importFoundryLoots,
  listFoundryLootsHandler,
  getFoundryLootHandler,
  updateFoundryLootFormatHandler,
  deleteFoundryLootHandler,
  exportFoundryLootHandler,
} from "../controllers/foundryLootController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryLoots);
router.get("/", listFoundryLootsHandler);
router.get("/:id", getFoundryLootHandler);
router.put("/:id/format", updateFoundryLootFormatHandler);
router.delete("/:id", deleteFoundryLootHandler);
router.get("/:id/export", exportFoundryLootHandler);

export default router;
