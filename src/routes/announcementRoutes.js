import express from "express";
import { getAnnouncementPublic } from "../controllers/adminAnnouncementController.js";

const router = express.Router();

/**
 * GET /announcements?position=left|right
 * return: single announcement (the latest active & within schedule)
 */
router.get("/", getAnnouncementPublic);

export default router;
