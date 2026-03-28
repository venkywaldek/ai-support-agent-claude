import express from 'express';
import {handleAgentRequest} from "../controllers/reportController.js"

const router = express.Router();

router.post("/agent", handleAgentRequest);

export default router;