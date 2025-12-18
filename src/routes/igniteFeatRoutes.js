// routes/igniteFeatRoutes.js
import express from "express";
import { getIgniteFeatsHandler } from "../controllers/ignite/igniteFeatController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
const router = express.Router();

router.get("", getIgniteFeatsHandler);
router.get("/all", verifyUserIgnite, getIgniteFeatsHandler);

export default router;
