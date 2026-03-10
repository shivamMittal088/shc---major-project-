export function formatPageLoadTime(loadTimeMs: number) {
  if (loadTimeMs < 1000) {
    return `${loadTimeMs} ms`;
  }

  return `${(loadTimeMs / 1000).toFixed(2)} s`;
}