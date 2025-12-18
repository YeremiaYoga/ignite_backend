// routes/foundryFeatRoutes.js
import express from "express";
import multer from "multer";

import {
  importFoundryFeats,
  importFoundryFeatsFromFiles,
  listFoundryFeatsHandler,
  getFoundryFeatHandler,
  updateFoundryFeatFormatHandler,
  deleteFoundryFeatHandler,
  exportFoundryFeatHandler,
} from "../controllers/admin/foundryFeatController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer(); // memory storage

// semua route di-protect full auth seperti weapons
router.use(verifyUserFullAuth);

// import dari JSON body (1 object atau array)
router.post("/import", importFoundryFeats);

// import dari multiple file (field name: "files")
router.post(
  "/import-files",
  upload.array("files"),
  importFoundryFeatsFromFiles
);

// list feats
router.get("/", listFoundryFeatsHandler);

// detail feat
router.get("/:id", getFoundryFeatHandler);

// update (misal format_data, dll)
router.put("/:id/format", updateFoundryFeatFormatHandler);

// delete feat
router.delete("/:id", deleteFoundryFeatHandler);

// export feat (raw/format/both)
router.get("/:id/export", exportFoundryFeatHandler);

export default router;
