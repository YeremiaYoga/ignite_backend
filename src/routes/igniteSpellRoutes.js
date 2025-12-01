// routes/igniteSpellRoutes.js
import express from "express";
import {
  getIgniteSpells,
  toggleFavoriteIgniteSpell,
} from "../controllers/igniteSpellController.js";

import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();

router.get("/all", getIgniteSpells);

router.post("/:id/favorite", verifyUserIgnite, toggleFavoriteIgniteSpell);

export default router;
