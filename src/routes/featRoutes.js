import express from "express";
import {
  fetchAllFeats,
  fetchFeatById,
  createNewFeat,
  updateFeatData,
  deleteFeatData,
} from "../controllers/featController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

// 📜 ROUTES
router.get("/", fetchAllFeats);
router.get("/:id", fetchFeatById);
router.post("/", verifyUserFullAuth, createNewFeat);
router.patch("/:id", verifyUserFullAuth, updateFeatData);
router.delete("/:id", verifyUserFullAuth, deleteFeatData);

export default router;
