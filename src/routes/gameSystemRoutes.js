import express from "express";
import {
  listGameSystems,
  getGameSystem,
  createGameSystemCtrl,
  updateGameSystemCtrl,
  deleteGameSystemCtrl,
} from "../controllers/gameSystemController.js";

const router = express.Router();

router.get("/", listGameSystems);
router.get("/:id", getGameSystem);
router.post("/", createGameSystemCtrl);
router.put("/:id", updateGameSystemCtrl);
router.delete("/:id", deleteGameSystemCtrl);

export default router;
