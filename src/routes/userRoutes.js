// import express from "express";
// import { syncUser } from "../controllers/userController.js";
// import { requireAuth } from "@clerk/express";

// const router = express.Router();

// router.get("/me", requireAuth(), syncUser);

// export default router;

import express from "express";
import { loginUser, getUserById } from "../controllers/userController.js";

const router = express.Router();

router.post("/login", loginUser);

// router.get("/:id", getUserById);

router.get("/:clerkId", getUserById);

export default router;
