import express from "express";
import {
  loginUser,
  getUser,
  updateUser,
} from "../controllers/userController.js";
import {
  loginUserJWT,
  refreshAccessToken,
  logoutUser,
} from "../controllers/userJwtController.js";

const router = express.Router();

// === CLERK AUTH ===
router.post("/login", loginUser); // login Clerk
router.get("/:clerkId", getUser); // get user Clerk
router.patch("/:id", updateUser); // update user Clerk

// === JWT AUTH ===
router.post("/jwt-login", loginUserJWT);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

export default router;
