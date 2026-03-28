import express from "express";
import {
  getAllWorkLogs,
  getFlaggedWorkLogs,
  getWorkLogsByWorker,
  getDashboardSummary,
} from "../tools/workLogStore.js";

const router = express.Router();

router.get("/admin/worklogs", (_req, res) => {
  return res.json({
    work_logs: getAllWorkLogs(),
  });
});

router.get("/admin/flagged", (_req, res) => {
  return res.json({
    flagged_work_logs: getFlaggedWorkLogs(),
  });
});

router.get("/admin/summary", (_req, res) => {
  return res.json({
    summary: getDashboardSummary(),
  });
});

router.get("/admin/worker/:workerId", (req, res) => {
  const workerId = req.params.workerId?.toUpperCase();

  return res.json({
    worker_id: workerId,
    work_logs: getWorkLogsByWorker(workerId),
  });
});

export default router;