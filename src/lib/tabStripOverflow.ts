export function tabStripNeedsCompact({
  rowWidth,
  leadingPadding,
  tabsWidth,
  actionsWidth,
  hiddenLabelWidth,
}: {
  rowWidth: number;
  leadingPadding: number;
  tabsWidth: number;
  actionsWidth: number;
  hiddenLabelWidth: number;
}): boolean {
  return (
    leadingPadding + tabsWidth + actionsWidth + hiddenLabelWidth > rowWidth
  );
}
