// Simple per-kind throttle. First call is allowed; later calls are blocked until
// at least windowMs have elapsed since the last allowed call.
export function createThrottle(windowMs, now = () => Date.now()) {
  const lastAllowed = new Map();
  return {
    allow(kind) {
      const t = now();
      const prev = lastAllowed.get(kind);
      if (prev !== undefined && t - prev < windowMs) return false;
      lastAllowed.set(kind, t);
      return true;
    }
  };
}
