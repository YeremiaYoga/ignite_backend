import express from "express";
import {
  getAll,
  getByRaceId,
  create,
  update,
  remove,
} from "../controllers/subraceController.js";

const router = express.Router();

router.get("/", getAll);
router.get("/race/:raceId", getByRaceId);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;
