import express from "express";
import {
  fetchAllGroupTypes,
  addGroupType,
  editGroupType,
  removeGroupType,
} from "../controllers/speciesGroupTypeController.js";

const router = express.Router();

router.get("/", fetchAllGroupTypes);
router.post("/", addGroupType);
router.put("/:id", editGroupType);
router.delete("/:id", removeGroupType);

export default router;
