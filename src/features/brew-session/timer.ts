export function getElapsedMilliseconds(startedAt: string, now: number) {
  const startedAtMilliseconds = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMilliseconds)) {
    throw new Error("Brew start time is invalid.");
  }

  return Math.max(0, now - startedAtMilliseconds);
}

export function getElapsedSeconds(startedAt: string, now: number) {
  return Math.floor(getElapsedMilliseconds(startedAt, now) / 1000);
}
