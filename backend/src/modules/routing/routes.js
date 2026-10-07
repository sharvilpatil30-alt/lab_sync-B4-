import express from "express";
import { getRoute } from "./controller.js";

const router = express.Router();

router.get("/route", getRoute);

export default router;