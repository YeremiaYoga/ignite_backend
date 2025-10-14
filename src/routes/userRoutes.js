import express from "express";
import {
  loginUser,
  getUser,
  updateUser,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/login", loginUser);
router.get("/:clerkId", getUser);
router.patch("/:id", updateUser);

export default router;
