import express from "express";
import { googleAuth, login, register } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google-auth", googleAuth);



export default router;