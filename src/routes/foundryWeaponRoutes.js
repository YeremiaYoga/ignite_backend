// routes/foundryWeaponRoutes.js
import express from "express";
import multer from "multer";

import {
  importFoundryWeapons,               // body JSON (1 atau array)
  importFoundryWeaponsFromFiles,      // 🆕 multi file JSON
  listFoundryWeaponsHandler,
  getFoundryWeaponHandler,
  updateFoundryWeaponFormatHandler,
  deleteFoundryWeaponHandler,
  exportFoundryWeaponHandler, // export 1 weapon
} from "../controllers/foundryWeaponController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer(); // pakai memory storage default

router.use(verifyUserFullAuth);

router.post("/import", importFoundryWeapons);

router.post(
  "/import-files",
  upload.array("files"),
  importFoundryWeaponsFromFiles
);

router.get("/", listFoundryWeaponsHandler);

router.get("/:id", getFoundryWeaponHandler);

router.put("/:id/format", updateFoundryWeaponFormatHandler);

router.delete("/:id", deleteFoundryWeaponHandler);

router.get("/:id/export", exportFoundryWeaponHandler);

export default router;
