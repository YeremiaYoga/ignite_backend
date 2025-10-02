import express from "express";
import { loginUser, getUser } from "../controllers/userController.js";

const router = express.Router();

router.post("/login", loginUser);
router.get("/:clerkId", getUser);

export default router;
