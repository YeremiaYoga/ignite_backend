// routes/foundryItemsRoutes.js
import express from "express";
import { getFoundryItems } from "../controllers/foundryItemsController.js";
// import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
const router = express.Router();
// router.use(verifyUserIgnite);
// GET /foundry/items
router.get("/all", getFoundryItems);

export default router;
