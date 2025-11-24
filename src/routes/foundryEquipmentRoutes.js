// routes/foundryEquipmentRoutes.js
import express from "express";
import {
  importFoundryEquipments,
  listFoundryEquipmentsHandler,
  getFoundryEquipmentHandler,
  updateFoundryEquipmentHandler,
  deleteFoundryEquipmentHandler,
  exportFoundryEquipmentHandler,
} from "../controllers/foundryEquipmentController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryEquipments);
router.get("/", listFoundryEquipmentsHandler);
router.get("/:id", getFoundryEquipmentHandler);
router.put("/:id", updateFoundryEquipmentHandler);
router.delete("/:id", deleteFoundryEquipmentHandler);
router.get("/:id/export", exportFoundryEquipmentHandler);

export default router;
