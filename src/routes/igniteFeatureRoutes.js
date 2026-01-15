// routes/igniteFeatureRoutes.js
import express from "express";
import {
  getIgniteFeaturesHandler,
  getIgniteFeaturesAllHandler,
} from "../controllers/ignite/igniteFeatureController.js";

const router = express.Router();

router.get("/", getIgniteFeaturesHandler);

router.get("/all", getIgniteFeaturesAllHandler);

export default router;
