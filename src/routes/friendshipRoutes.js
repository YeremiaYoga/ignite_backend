
import express from "express";
import {
  addFriendByCode,
  respondFriendRequest,
  removeFriend,
  blockUser,
  listFriends,
  listFriendRequests,
} from "../controllers/friendshipController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();


router.use(verifyUserIgnite);


router.get("/", listFriends);            
router.get("/requests", listFriendRequests); 

router.post("/add-by-code", addFriendByCode);  
router.post("/respond", respondFriendRequest); 
router.post("/block", blockUser);              


router.delete("/:friendId", removeFriend);     

export default router;
