// src/routes/igniteCalendarRoutes.js
import express from "express";
import {
  getIgniteCalendars,          
  getIgnitePublicCalendars,   
  getIgniteCalendarById,      
  getIgniteCalendarByShareId, 
  createIgniteCalendar,        
  updateIgniteCalendar,       
  deleteIgniteCalendar,       
} from "../controllers/ignite/igniteCalendarController.js";

import { verifyUserIgnite } from "../middlewares/verifyUserIgnite.js";

const router = express.Router();


router.get("/public", getIgnitePublicCalendars);
router.get("/share/:share_id", getIgniteCalendarByShareId);


router.get("/", verifyUserIgnite, getIgniteCalendars);
router.get("/:id", verifyUserIgnite, getIgniteCalendarById);
router.post("/", verifyUserIgnite, createIgniteCalendar);
router.patch("/:id", verifyUserIgnite, updateIgniteCalendar);
router.delete("/:id", verifyUserIgnite, deleteIgniteCalendar);

export default router;
