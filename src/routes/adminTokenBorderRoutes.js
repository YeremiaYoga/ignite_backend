// routes/adminTokenBordersRoutes.js
import express from "express";
import multer from "multer";
import {
  listTokenBordersAdmin,
  getTokenBorderAdmin,
  addTokenBorderAdmin,
  editTokenBorderAdmin,
  deleteTokenBorderAdmin,
} from "../controllers/adminTokenBorderController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", listTokenBordersAdmin);
router.get("/:id", getTokenBorderAdmin);

router.post(
  "/",
  upload.fields([{ name: "image", maxCount: 1 }]),
  addTokenBorderAdmin
);

router.put(
  "/:id",
  upload.fields([{ name: "image", maxCount: 1 }]),
  editTokenBorderAdmin
);

router.delete("/:id", deleteTokenBorderAdmin);

export default router;
