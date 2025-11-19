import express from "express";
import {
  listRealLanguages,
  getRealLanguage,
  createRealLanguageCtrl,
  updateRealLanguageCtrl,
  deleteRealLanguageCtrl,
} from "../controllers/realLanguageController.js";

const router = express.Router();

router.get("/", listRealLanguages);
router.get("/:id", getRealLanguage);
router.post("/", createRealLanguageCtrl);
router.put("/:id", updateRealLanguageCtrl);
router.delete("/:id", deleteRealLanguageCtrl);

export default router;
