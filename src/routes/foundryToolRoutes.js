// routes/foundryToolRoutes.js
import express from "express";
import multer from "multer";

import {
  importFoundryTools,               
  importFoundryToolsFromFiles,     
  listFoundryToolsHandler,
  getFoundryToolHandler,
  updateFoundryToolHandler,
  deleteFoundryToolHandler,
  exportFoundryToolHandler,
} from "../controllers/foundryToolController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer(); 

router.use(verifyUserFullAuth);

router.post("/import", importFoundryTools);

router.post(
  "/import-files",
  upload.array("files"),
  importFoundryToolsFromFiles
);

router.get("/", listFoundryToolsHandler);

router.get("/:id", getFoundryToolHandler);

router.put("/:id", updateFoundryToolHandler);

router.delete("/:id", deleteFoundryToolHandler);

router.get("/:id/export", exportFoundryToolHandler);

export default router;
