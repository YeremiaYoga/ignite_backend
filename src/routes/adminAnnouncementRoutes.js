import express from "express";
import multer from "multer";
import {
  getAnnouncementPublic,
  adminListAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminToggleAnnouncement,
  adminDeleteAnnouncement,
} from "../controllers/adminAnnouncementController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 🔹 PUBLIC endpoint
 * Example: GET /announcements?position=left
 */
router.get("/public", getAnnouncementPublic);

/**
 * 🔹 ADMIN endpoints
 */
router.get("/", verifyUserFullAuth, adminListAnnouncements);

router.post(
  "/",
  verifyUserFullAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  adminCreateAnnouncement
);

router.put(
  "/:id",
  verifyUserFullAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  adminUpdateAnnouncement
);

router.patch("/:id/toggle", verifyUserFullAuth, adminToggleAnnouncement);

router.delete("/:id", verifyUserFullAuth, adminDeleteAnnouncement);

export default router;
