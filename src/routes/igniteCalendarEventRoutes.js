import express from "express";
import {
  getIgniteCalendarEvents,
  createIgniteCalendarEvent,
  updateIgniteCalendarEvent,
  deleteIgniteCalendarEvent,
} from "../controllers/ignite/igniteCalendarEventController.js";

import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();

/* =========================
   Calendar Events
========================= */

router.get("/", verifyUserIgnite, getIgniteCalendarEvents);
router.post("/", verifyUserIgnite, createIgniteCalendarEvent);
router.patch("/:id", verifyUserIgnite, updateIgniteCalendarEvent);
router.delete("/:id", verifyUserIgnite, deleteIgniteCalendarEvent);

export default router;
