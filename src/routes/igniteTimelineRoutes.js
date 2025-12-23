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

const router = express.Router();

router.get("/", getIgniteTimelines);

router.get("/share/:share_id", getIgniteTimelineByShareId);

router.get("/:id", getIgniteTimelineById);

router.post("/", createIgniteTimeline);

router.patch("/:id", updateIgniteTimeline);

router.delete("/:id", deleteIgniteTimeline);

export default router;
