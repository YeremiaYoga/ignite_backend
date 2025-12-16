// src/routes/gdocsRoutes.js
import express from "express";
import {
  exportGdocHtmlHandler,
  gdocMetaHandler,
  importGdocHandler,
} from "../controllers/gdocsController.js";

const router = express.Router();

router.get("/export-html", exportGdocHtmlHandler);


router.get("/meta", gdocMetaHandler);


router.post("/import", importGdocHandler);

export default router;
