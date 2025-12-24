// src/routes/igniteTimelineRoutes.js
import express from "express";
import {
  getIgniteTimelines,
  getIgniteTimelineById,
  getIgniteTimelineByShareId,
  createIgniteTimeline,
  updateIgniteTimeline,
  deleteIgniteTimeline,
} from "../controllers/ignite/igniteTimelineController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
const router = express.Router();

router.get("/", verifyUserIgnite, getIgniteTimelines);

router.get("/share/:share_id", verifyUserIgnite, getIgniteTimelineByShareId);

router.get("/:id", verifyUserIgnite, getIgniteTimelineById);

router.post("/", verifyUserIgnite, createIgniteTimeline);

router.patch("/:id", verifyUserIgnite, updateIgniteTimeline);

router.delete("/:id", verifyUserIgnite, deleteIgniteTimeline);

export default router;
