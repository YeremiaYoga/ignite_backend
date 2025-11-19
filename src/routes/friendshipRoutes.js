// routes/friendshipRoutes.js
import express from "express";
import {
  addFriendByCode,
  respondFriendRequest,
  removeFriend,
  blockUser,
  listFriends,
  listFriendRequests,
} from "../controllers/friendshipController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js"; // ganti sesuai punyamu

const router = express.Router();

// semua route butuh user login
router.use(verifyUserIgnite);

router.post("/friendships/add-by-code", addFriendByCode);
router.post("/friendships/respond", respondFriendRequest);
router.delete("/friendships/:friendId", removeFriend);
router.post("/friendships/block", blockUser);
router.get("/friendships", listFriends);
router.get("/friendships/requests", listFriendRequests);

export default router;
