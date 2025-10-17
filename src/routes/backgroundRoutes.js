import express from "express";
import {
  fetchAllBackgrounds,
  fetchBackgroundById,
  createNewBackground,
  updateBackgroundData,
  deleteBackgroundData,
} from "../controllers/backgroundController.js";

const router = express.Router();

router.get("/", fetchAllBackgrounds);
router.get("/:id", fetchBackgroundById);
router.post("/", createNewBackground);
router.patch("/:id", updateBackgroundData);
router.delete("/:id", deleteBackgroundData);

export default router;
