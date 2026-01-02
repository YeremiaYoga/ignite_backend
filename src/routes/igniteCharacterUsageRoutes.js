import express from "express";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
import { igniteCharacterUsageController } from "../controllers/ignite/igniteCharacterUsageController.js";

const router = express.Router();


router.get(
  "/usage",
  verifyUserIgnite,           
  igniteCharacterUsageController
);

export default router;
