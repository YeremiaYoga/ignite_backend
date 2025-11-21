// routes/foundryToolRoutes.js
import express from "express";
import {
  importFoundryTools,
  listFoundryToolsHandler,
  getFoundryToolHandler,
  updateFoundryToolHandler,
  deleteFoundryToolHandler,
  exportFoundryToolHandler,
} from "../controllers/foundryToolController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryTools);
router.get("/", listFoundryToolsHandler);
router.get("/:id", getFoundryToolHandler);
router.put("/:id", updateFoundryToolHandler);
router.delete("/:id", deleteFoundryToolHandler);

// 🆕 Export tool
router.get("/:id/export", exportFoundryToolHandler);

export default router;
