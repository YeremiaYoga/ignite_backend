// routes/foundryConsumableRoutes.js
import express from "express";
import {
  importFoundryConsumables,
  listFoundryConsumablesHandler,
  getFoundryConsumableHandler,
  updateFoundryConsumableHandler,
  deleteFoundryConsumableHandler,
  exportFoundryConsumableHandler,
} from "../controllers/foundryConsumableController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryConsumables);
router.get("/", listFoundryConsumablesHandler);
router.get("/:id", getFoundryConsumableHandler);
router.put("/:id", updateFoundryConsumableHandler);
router.delete("/:id", deleteFoundryConsumableHandler);
router.get("/:id/export", exportFoundryConsumableHandler);

export default router;
