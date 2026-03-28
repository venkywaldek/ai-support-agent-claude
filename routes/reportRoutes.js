import express from 'express';
import {handleAgentRequest} from "../controllers/reportController.js"

const router = express.Router();

router.post("/report", handleAgentRequest);

export default router;