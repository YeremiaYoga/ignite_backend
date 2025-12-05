// routes/igniteTokenBorderRoutes.js
import express from "express";
import {
  listIgniteTokenBordersHandler,
  getIgniteTokenBorderHandler,
} from "../controllers/ignite/igniteTokenBorderController.js";

const router = express.Router();

// GET /ignite/token-borders
router.get("/", listIgniteTokenBordersHandler);

// GET /ignite/token-borders/:id
router.get("/:id", getIgniteTokenBorderHandler);

export default router;
