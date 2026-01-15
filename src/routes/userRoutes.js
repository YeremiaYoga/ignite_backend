import express from "express";
import {
  getUser,
  updateUser,
  logoutUserIgnite,
  getUserMe,
  listCampaignGenres,
  listGameSystems,
} from "../controllers/userController.js";
import {
  loginAdminJWT,
  verifyAccessToken,
} from "../controllers/userJwtController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();

router.get("/campaign-genres", verifyUserIgnite, listCampaignGenres);
router.get("/game-systems", verifyUserIgnite, listGameSystems);

// === CLERK AUTH ===
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
