// Runs async tasks one after another. Used to serialize read-modify-write updates.
export function createSerialQueue() {
  let tail = Promise.resolve();
  return {
    run(fn) {
      const result = tail.then(() => fn());
      // Keep the chain alive when a task fails; the caller still sees the rejection.
      tail = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    }
  };
}
