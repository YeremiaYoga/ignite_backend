import express from "express";
import {
  getIgniteHomebrewSources,
  getIgniteHomebrewAll,
  getIgniteHomebrewSource,
  getIgniteHomebrewSourceByShare,
  postIgniteHomebrewSource,
  patchIgniteHomebrewSource,
  removeIgniteHomebrewSource,
} from "../controllers/ignite/igniteHomebrewController.js";

const router = express.Router();

router.get("/", getIgniteHomebrewSources);

router.get("/all", getIgniteHomebrewAll);

router.get("/share/:shareId", getIgniteHomebrewSourceByShare);

router.get("/:id", getIgniteHomebrewSource);

router.post("/", postIgniteHomebrewSource);
router.patch("/:id", patchIgniteHomebrewSource);
router.delete("/:id", removeIgniteHomebrewSource);

export default router;
