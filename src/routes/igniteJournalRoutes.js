import express from "express";
import {
  getIgniteJournals,
  getAllIgniteJournals,
  getIgniteJournalDetail,
  getIgniteJournalByShare,
  createIgniteJournalHandler,
  updateIgniteJournalHandler,
  deleteIgniteJournalHandler,
} from "../controllers/ignite/igniteJournalController.js";
import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";
const router = express.Router();

router.get("/", verifyUserIgnite, getIgniteJournals);
router.get("/all", verifyUserIgnite, getAllIgniteJournals);

router.get("/share/:shareId", verifyUserIgnite, getIgniteJournalByShare);
router.get("/:id", verifyUserIgnite, getIgniteJournalDetail);

router.post("/", verifyUserIgnite, createIgniteJournalHandler);
router.put("/:id", verifyUserIgnite, updateIgniteJournalHandler);
router.delete("/:id", verifyUserIgnite, deleteIgniteJournalHandler);

export default router;
