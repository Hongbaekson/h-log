export function snapshotFreshness(observedAt: string, now: number): "fresh" | "stale" {
  return now - Date.parse(observedAt) > 180000 ? "stale" : "fresh";
}
