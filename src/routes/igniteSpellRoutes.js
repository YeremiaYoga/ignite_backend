// routes/igniteSpellRoutes.js
import express from "express";

import {
  getIgniteSpells,
  toggleFavoriteIgniteSpell,
  rateIgniteSpell,
} from "../controllers/ignite/igniteSpellController.js";

import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();

router.get("", getIgniteSpells);
router.get("/all", verifyUserIgnite, getIgniteSpells);
router.post("/:id/favorite", verifyUserIgnite, toggleFavoriteIgniteSpell);

router.post("/:id/rate", verifyUserIgnite, rateIgniteSpell);

export default router;
