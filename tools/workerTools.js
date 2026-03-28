export function getWorkerById(workerId, workers) {
  return workers.find((worker) => worker.worker_id === workerId) || null;
}

export function hasCertification(worker, requiredCertification) {
  if (!requiredCertification) return true;
  if (!worker || !Array.isArray(worker.certifications)) return false;

  return worker.certifications.some(
    (cert) => cert.toLowerCase() === requiredCertification.toLowerCase()
  );
}