import express from "express";
import multer from "multer";

import {
  listWorldsAdmin,
  getWorldAdmin,
  addWorldAdmin,
  editWorldAdmin,
  deleteWorldAdmin,
} from "../controllers/adminWorldController.js";

import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.get("/", verifyUserFullAuth, listWorldsAdmin);
router.get("/:id", verifyUserFullAuth, getWorldAdmin);
router.post(
  "/",
  verifyUserFullAuth,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 }, 
  ]),
  addWorldAdmin
);
router.put(
  "/:id",
  verifyUserFullAuth,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  editWorldAdmin
);
router.delete("/:id", verifyUserFullAuth, deleteWorldAdmin);
export default router;
