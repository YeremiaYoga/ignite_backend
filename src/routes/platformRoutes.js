import express from "express";
import {
  listPlatforms,
  getPlatform,
  createPlatformCtrl,
  updatePlatformCtrl,
  deletePlatformCtrl,
} from "../controllers/platformController.js";

const router = express.Router();

router.get("/", listPlatforms);
router.get("/:id", getPlatform);
router.post("/", createPlatformCtrl);
router.put("/:id", updatePlatformCtrl);
router.delete("/:id", deletePlatformCtrl);

export default router;
