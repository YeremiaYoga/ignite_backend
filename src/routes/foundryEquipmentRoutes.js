// routes/foundryEquipmentRoutes.js
import express from "express";
import multer from "multer";

import {
  importFoundryEquipments,                // import via JSON body
  importFoundryEquipmentsFromFiles,       // 🆕 mass import via file upload
  listFoundryEquipmentsHandler,
  getFoundryEquipmentHandler,
  updateFoundryEquipmentHandler,
  deleteFoundryEquipmentHandler,
  exportFoundryEquipmentHandler,
} from "../controllers/foundryEquipmentController.js";

import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer(); // memory storage (sama seperti weapon)

// Middleware auth
router.use(verifyUserFullAuth);

// --- IMPORT ---
router.post("/import", importFoundryEquipments);

router.post(
  "/import-files",
  upload.array("files"),         // <input type="file" name="files" multiple>
  importFoundryEquipmentsFromFiles
);

// --- CRUD ---
router.get("/", listFoundryEquipmentsHandler);
router.get("/:id", getFoundryEquipmentHandler);
router.put("/:id", updateFoundryEquipmentHandler);
router.delete("/:id", deleteFoundryEquipmentHandler);

// --- EXPORT ---
router.get("/:id/export", exportFoundryEquipmentHandler);

export default router;
