export function fingerprintOccurrences(
  rows: ReadonlyArray<{ fingerprintKey: string }>,
): number[] {
  const seen = new Map<string, number>();
  return rows.map(({ fingerprintKey }) => {
    const occurrence = (seen.get(fingerprintKey) ?? 0) + 1;
    seen.set(fingerprintKey, occurrence);
    return occurrence;
  });
}
