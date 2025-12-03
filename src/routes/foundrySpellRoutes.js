// routes/foundrySpellRoutes.js
import express from "express";
import multer from "multer";
import {
  importFoundrySpells,
  importFoundrySpellsFromFiles,
  listFoundrySpellsHandler,
  getFoundrySpellHandler,
  updateFoundrySpellFormatHandler,
  deleteFoundrySpellHandler,
  exportFoundrySpellHandler,
  updateSpellClasses,
  updateSpellDamageType,
  updateSpellSubclasses,
  updateSpellSpecies,
  updateSpellSubspecies,
} from "../controllers/foundrySpellController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer();

router.use(verifyUserFullAuth);

router.post("/import", importFoundrySpells);
router.post(
  "/import-files",
  upload.array("files"),
  importFoundrySpellsFromFiles
);

router.get("/", listFoundrySpellsHandler);
router.get("/:id", getFoundrySpellHandler);
router.put("/:id/format", updateFoundrySpellFormatHandler);
router.delete("/:id", deleteFoundrySpellHandler);
router.get("/:id/export", exportFoundrySpellHandler);

router.put("/:id/classes", updateSpellClasses);
router.put("/:id/damage-type", updateSpellDamageType);
router.put("/:id/subclasses", updateSpellSubclasses);
router.put("/:id/species", updateSpellSpecies);
router.put("/:id/subspecies", updateSpellSubspecies);

export default router;
