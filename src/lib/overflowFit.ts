export function countFittingItems({
  containerWidth,
  itemWidths,
  gap,
  counterWidth,
}: {
  containerWidth: number;
  itemWidths: number[];
  gap: number;
  counterWidth: number;
}): number {
  const totalWidth = itemWidths.reduce(
    (sum, width, index) => sum + width + (index > 0 ? gap : 0),
    0,
  );
  if (totalWidth <= containerWidth) return itemWidths.length;

  let usedWidth = counterWidth;
  let count = 0;
  for (const width of itemWidths) {
    const nextWidth = usedWidth + gap + width;
    if (nextWidth > containerWidth) break;
    usedWidth = nextWidth;
    count += 1;
  }
  return Math.max(count, 1);
}
