import express from "express";
import {
  getTraitsAdmin,
  getTraitAdmin,
  addTraitAdmin,
  editTraitAdmin,
  deleteTraitAdmin,
  getTraitsByIdsAdmin, // ✅ baru
} from "../controllers/adminTraitController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

// 🧠 Routes
router.get("/", verifyUserFullAuth, getTraitsAdmin);           // get all traits
router.get("/by-ids", verifyUserFullAuth, getTraitsByIdsAdmin);
router.get("/:id", verifyUserFullAuth, getTraitAdmin);         // get one trait
router.post("/", verifyUserFullAuth, addTraitAdmin);           // create
router.put("/:id", verifyUserFullAuth, editTraitAdmin);        // update
router.delete("/:id", verifyUserFullAuth, deleteTraitAdmin);   // delete

export default router;
