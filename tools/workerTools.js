
export function getWorkerById(workerId, workers) {
  return workers.find((worker) => worker.worker_id === workerId) || null;
}

export function hasCertification(worker, requiredText) {
  if (!requiredText) return true;
  if (!worker || !Array.isArray(worker.certifications)) return false;

  const target = requiredText.toLowerCase();

  return worker.certifications.some((cert) => {
    const values = Object.values(cert).join(" ").toLowerCase();
    return values.includes(target);
  });
}

export function isAssignedToCustomer(worker, customerId) {
  if (!worker || !Array.isArray(worker.assigned_customers)) return false;
  return worker.assigned_customers.includes(customerId);
}