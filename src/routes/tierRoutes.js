import express from "express";
import {
  getTiers,
  getTier,
  createTierController,
  updateTierController,
  deleteTierController,
} from "../controllers/tierController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";
import { verifyAdminRole } from "../middlewares/verifyAdminRole.js";

const router = express.Router();

// 👥 Semua user login bisa lihat tier
router.get("/", verifyUserFullAuth, getTiers);
router.get("/:id", verifyUserFullAuth, getTier);

// 🛡️ Hanya admin/superadmin bisa ubah tier
router.post("/", verifyUserFullAuth, verifyAdminRole, createTierController);
router.put("/:id", verifyUserFullAuth, verifyAdminRole, updateTierController);
router.delete("/:id", verifyUserFullAuth, verifyAdminRole, deleteTierController);

export default router;
