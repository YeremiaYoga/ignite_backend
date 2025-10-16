import express from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
} from "../controllers/incumbencyController.js";

const router = express.Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;
