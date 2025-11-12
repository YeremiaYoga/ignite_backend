import express from "express";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";
import {
  adminListThemes, adminCreateTheme, adminUpdateTheme, adminDeleteTheme,
  adminListGenres, adminCreateGenre, adminUpdateGenre, adminDeleteGenre,
} from "../controllers/adminThemeAndGenreCampaignController.js";

const router = express.Router();

/* ====== THEME ====== */
router.get("/themes", verifyUserFullAuth, adminListThemes);
router.post("/themes", verifyUserFullAuth, adminCreateTheme);
router.put("/themes/:id", verifyUserFullAuth, adminUpdateTheme);
router.delete("/themes/:id", verifyUserFullAuth, adminDeleteTheme);

/* ====== GENRE ====== */
router.get("/genres", verifyUserFullAuth, adminListGenres);
router.post("/genres", verifyUserFullAuth, adminCreateGenre);
router.put("/genres/:id", verifyUserFullAuth, adminUpdateGenre);
router.delete("/genres/:id", verifyUserFullAuth, adminDeleteGenre);

export default router;
