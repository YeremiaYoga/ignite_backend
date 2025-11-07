import express from "express";
import {
  listTraitModifiers,
  getTraitModifier,
  createTraitModifierCtrl,
  updateTraitModifierCtrl,
  deleteTraitModifierCtrl,
  addSubtypeCtrl,
  updateSubtypeCtrl,
  removeSubtypeCtrl,
} from "../controllers/traitModifierController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

// 🔹 Trait Modifier CRUD
router.get("/", verifyUserFullAuth, listTraitModifiers);
router.get("/:id", verifyUserFullAuth, getTraitModifier);
router.post("/", verifyUserFullAuth, createTraitModifierCtrl);
router.put("/:id", verifyUserFullAuth, updateTraitModifierCtrl);
router.delete("/:id", verifyUserFullAuth, deleteTraitModifierCtrl);

// 🔹 Subtype CRUD
router.post("/:id/subtype", verifyUserFullAuth, addSubtypeCtrl);
router.put("/:id/subtype/:slug", verifyUserFullAuth, updateSubtypeCtrl);
router.delete("/:id/subtype/:slug", verifyUserFullAuth, removeSubtypeCtrl);

export default router;
