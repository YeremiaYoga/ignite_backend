import express from "express";
import {
  getAll,
  getById,
  getByName, // 👈 tambahkan
  create,
  update,
  remove,
  getByKey,
} from "../controllers/incumbencyController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();

router.get("/", getAll);
router.get("/name/:name", getByName);
router.get("/:id", getById);
router.post("/", verifyUserFullAuth, create);
router.patch("/:id", update);
router.delete("/:id", remove);
router.get("/key/:key", getByKey);

export default router;
