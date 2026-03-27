import express from 'express';
import {handleAgentRequest} from "../controllers/agentController.js"

const router = express.Router();

router.post("/agent", handleAgentRequest);

export default router;