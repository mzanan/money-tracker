const INNER_CONTROLS = "button, a, input, select, textarea, [role='menuitem']";

export function isRowOwnClick(
  target: EventTarget | null,
  row: Element,
): boolean {
  if (!(target instanceof Element) || !row.contains(target)) return false;
  const control = target.closest(INNER_CONTROLS);
  return control === null || !row.contains(control) || control === row;
}
