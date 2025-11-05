import express from "express";
import multer from "multer";
import {
  fetchAllDndSources,
  addDndSource,
  editDndSource,
  removeDndSource,
} from "../controllers/dndSourceController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", fetchAllDndSources);
router.post("/", upload.fields([{ name: "icon", maxCount: 1 }]), addDndSource);
router.put("/:id", upload.fields([{ name: "icon", maxCount: 1 }]), editDndSource);
router.delete("/:id", removeDndSource);

export default router;
