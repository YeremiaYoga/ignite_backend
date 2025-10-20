// src/routes/raceRoutes.js
import express from "express";
import {
  getAll,
  getById,
  getByKey,
  create,
  update,
  remove,
} from "../controllers/raceController.js";

const router = express.Router();

router.get("/", getAll);
router.get("/:id", getById);
router.get("/key/:key", getByKey);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;
