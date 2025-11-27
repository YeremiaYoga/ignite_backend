// routes/foundryContainerRoutes.js
import express from "express";
import multer from "multer";
import {
  importFoundryContainers,
  importFoundryContainersFromFiles,
  listFoundryContainersHandler,
  getFoundryContainerHandler,
  updateFoundryContainerHandler,
  deleteFoundryContainerHandler,
  exportFoundryContainerHandler,
} from "../controllers/foundryContainerController.js";
import { verifyUserFullAuth } from "../middlewares/verifyUserFullAuth.js";

const router = express.Router();
const upload = multer();

router.use(verifyUserFullAuth);

router.post("/import", importFoundryContainers);
router.post(
  "/import-files",
  upload.array("files"),
  importFoundryContainersFromFiles
);

router.get("/", listFoundryContainersHandler);
router.get("/:id", getFoundryContainerHandler);
router.put("/:id", updateFoundryContainerHandler);
router.delete("/:id", deleteFoundryContainerHandler);
router.get("/:id/export", exportFoundryContainerHandler);

export default router;
