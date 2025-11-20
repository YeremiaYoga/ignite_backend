// routes/foundryWeaponRoutes.js
import express from "express";
import {
  importFoundryWeapons,
  listFoundryWeaponsHandler,
  getFoundryWeaponHandler,
  updateFoundryWeaponFormatHandler,
  deleteFoundryWeaponHandler,
  exportFoundryWeaponHandler, // 🆕
} from "../controllers/foundryWeaponController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();

router.use(verifyUserIgnite);

router.post("/import", importFoundryWeapons);
router.get("/", listFoundryWeaponsHandler);
router.get("/:id", getFoundryWeaponHandler);
router.put("/:id/format", updateFoundryWeaponFormatHandler);
router.delete("/:id", deleteFoundryWeaponHandler);

// 🆕 GET /foundry/weapons/:id/export?mode=raw|format
router.get("/:id/export", exportFoundryWeaponHandler);

export default router;
