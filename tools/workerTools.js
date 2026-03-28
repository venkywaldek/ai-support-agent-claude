
export function getWorkerById(worker_id, workers) {
  const id = worker_id?.toUpperCase();

  return workers.find(
    (w) => w.worker_id?.toUpperCase() === id
  );
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
export function detectWorkerFromMessage(message, workers) {
  const text = message.toLowerCase();

  for (const worker of workers) {
    const name = worker.name?.toLowerCase() || "";
    const id = worker.worker_id?.toLowerCase() || "";

    // Match:
    // "Janne here"
    // "this is Pekka"
    // "W-002"
    if (
      text.includes(name) ||
      text.includes(id) ||
      text.startsWith(`${name.split(" ")[0]} here`) ||
      text.startsWith(`this is ${name.split(" ")[0]}`)
    ) {
      return worker;
    }
  }

  return null;
}