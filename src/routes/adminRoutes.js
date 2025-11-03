import express from "express";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";
import {
  getAllUsers,
  createUser,
  updateUserById,
  deleteUserById,
} from "../controllers/adminController.js";

const router = express.Router();

// Semua endpoint admin pakai middleware sama
router.use(verifyUserFullAuth);

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUserById);
router.delete("/users/:id", deleteUserById);

export default router;
