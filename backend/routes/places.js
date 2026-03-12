import express from "express";
import { searchPlaces } from "../controllers/places.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/nearby", authMiddleware, searchPlaces);

export default router;
