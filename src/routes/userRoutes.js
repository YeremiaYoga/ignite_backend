import express from "express";
import {
  loginUser,
  getUser,
  updateUser,
  logoutUserIgnite,
  getUserMe 
} from "../controllers/userController.js";
import {
  loginAdminJWT,
  verifyAccessToken,
  logoutUser,
} from "../controllers/userJwtController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
const router = express.Router();

// === CLERK AUTH ===

router.post("/login", loginUser); 
router.get("/me", verifyUserIgnite, getUserMe);
router.get("/:clerkId", getUser); 
router.patch("/:id", verifyUserIgnite, updateUser); 
router.post("/logout", logoutUserIgnite);

// === JWT AUTH ===
router.post("/jwt-login", loginAdminJWT);
router.get("/verify", verifyAccessToken, (req, res) => {
  res.json({ success: true, user: req.user });
});
// router.post("/logout", logoutUser);

export default router;
