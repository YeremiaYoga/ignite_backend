// routes/foundryItemsRoutes.js
import express from "express";
import {
  getFoundryItems,
  toggleFavoriteFoundryItem,
} from "../controllers/foundryItemsController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
const router = express.Router();

router.get("/all", getFoundryItems);

router.post("/:type/:id/favorite", verifyUserIgnite, toggleFavoriteFoundryItem);
export default router;
