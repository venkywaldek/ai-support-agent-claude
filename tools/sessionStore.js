const sessionStore = new Map();

export function getSession(workerId) {
  return sessionStore.get(workerId) || null;
}

export function setSession(workerId, data) {
  sessionStore.set(workerId, data);
}

export function clearSession(workerId) {
  sessionStore.delete(workerId);
}