import express from "express";
import {
  listModifiers,
  getModifier,
  createModifierCtrl,
  updateModifierCtrl,
  deleteModifierCtrl,
  addSubtypeCtrl,
  updateSubtypeCtrl,
  removeSubtypeCtrl,
} from "../controllers/modifierController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

// 🔹 Modifier CRUD
router.get("/", verifyUserFullAuth, listModifiers);
router.get("/:id", verifyUserFullAuth, getModifier);
router.post("/", verifyUserFullAuth, createModifierCtrl);
router.put("/:id", verifyUserFullAuth, updateModifierCtrl);
router.delete("/:id", verifyUserFullAuth, deleteModifierCtrl);

// 🔹 Subtype CRUD
router.post("/:id/subtype", verifyUserFullAuth, addSubtypeCtrl);
router.put("/:id/subtype/:slug", verifyUserFullAuth, updateSubtypeCtrl);
router.delete("/:id/subtype/:slug", verifyUserFullAuth, removeSubtypeCtrl);

export default router;
