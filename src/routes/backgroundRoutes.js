import express from "express";
import {
  fetchAllBackgrounds,
  fetchBackgroundById,
  createNewBackground,
  updateBackgroundData,
  deleteBackgroundData,
} from "../controllers/backgroundController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";
const router = express.Router();

router.get("/", fetchAllBackgrounds);
router.get("/:id", fetchBackgroundById);
router.post("/", verifyUserFullAuth, createNewBackground);
router.patch("/:id", verifyUserFullAuth, updateBackgroundData);
router.delete("/:id", verifyUserFullAuth, deleteBackgroundData);

export default router;
