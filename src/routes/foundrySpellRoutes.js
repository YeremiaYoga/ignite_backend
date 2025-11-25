// routes/foundrySpellRoutes.js
import express from "express";
import {
  importFoundrySpells,
  listFoundrySpellsHandler,
  getFoundrySpellHandler,
  updateFoundrySpellFormatHandler,
  deleteFoundrySpellHandler,
  exportFoundrySpellHandler,
} from "../controllers/foundrySpellController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

router.use(verifyUserFullAuth);

router.post("/import", importFoundrySpells);
router.get("/", listFoundrySpellsHandler);
router.get("/:id", getFoundrySpellHandler);
router.put("/:id/format", updateFoundrySpellFormatHandler);
router.delete("/:id", deleteFoundrySpellHandler);
router.get("/:id/export", exportFoundrySpellHandler);

export default router;
