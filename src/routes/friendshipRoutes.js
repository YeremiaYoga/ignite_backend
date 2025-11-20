import express from "express";
import {
  addFriendByCode,
  respondFriendRequest,
  removeFriend,
  blockUser,
  listFriends,
  listFriendRequests,
  listBlockedFriends,   // 🆕
  unblockUser,          // 🆕
} from "../controllers/friendshipController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();

router.use(verifyUserIgnite);

router.post("/add-by-code", addFriendByCode);
router.post("/respond", respondFriendRequest);
router.delete("/:friendId", removeFriend);
router.post("/block", blockUser);
router.post("/unblock", unblockUser);       // 🆕
router.get("/", listFriends);
router.get("/requests", listFriendRequests);
router.get("/blocked", listBlockedFriends); // 🆕

// di app.js: app.use("/friends", friendshipRoutes)

export default router;
