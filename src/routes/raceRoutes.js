// src/routes/raceRoutes.js
import express from "express";
import {
  getAll,
  getById,
  getByName,
  create,
  update,
  remove,
} from "../controllers/raceController.js";

const router = express.Router();

router.get("/", getAll);
router.get("/:id", getById);
router.get("/name/:name", getByName);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;
