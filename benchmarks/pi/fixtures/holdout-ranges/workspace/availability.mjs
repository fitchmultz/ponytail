export function totalDuration(ranges) {
  return ranges.reduce((sum, [start, end]) => sum + end - start, 0);
}
