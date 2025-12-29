import express from "express";
import {
  getHomebrewSources,
  getHomebrewSource,
  getHomebrewSourceByShare,
  postHomebrewSource,
  patchHomebrewSource,
  removeHomebrewSource,
} from "../controllers/admin/homebrewSourceController.js";

const router = express.Router();

router.get("/", getHomebrewSources);
router.post("/", postHomebrewSource);

router.get("/share/:shareId", getHomebrewSourceByShare);

router.get("/:id", getHomebrewSource);
router.patch("/:id", patchHomebrewSource);
router.delete("/:id", removeHomebrewSource);

export default router;
