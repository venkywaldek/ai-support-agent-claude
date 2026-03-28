const workLogs = [];

export function addWorkLog(workLog) {
  workLogs.unshift({
    ...workLog,
    created_at: new Date().toISOString(),
  });
}

export function getAllWorkLogs() {
  return workLogs;
}

export function getFlaggedWorkLogs() {
  return workLogs.filter(
    (log) =>
      log.status === "pending_approval" ||
      log.status === "pending_review" ||
      log.status === "prevented" ||
      (Array.isArray(log.compliance_flags) && log.compliance_flags.length > 0)
  );
}

export function getWorkLogsByWorker(workerId) {
  return workLogs.filter((log) => log.worker_id === workerId);
}

export function getDashboardSummary() {
  const total = workLogs.length;
  const pendingApproval = workLogs.filter(
    (log) => log.status === "pending_approval"
  ).length;
  const pendingReview = workLogs.filter(
    (log) => log.status === "pending_review"
  ).length;
  const prevented = workLogs.filter(
    (log) => log.status === "prevented"
  ).length;
  const billable = workLogs.filter((log) => log.billable).length;

  return {
    total,
    pendingApproval,
    pendingReview,
    prevented,
    billable,
  };
}