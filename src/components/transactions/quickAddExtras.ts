export function quickAddExtrasLabel(
  transfer: boolean,
  withdrawal: boolean,
): string {
  const extras = ["tags", "date"];
  if (transfer) extras.push("transfer");
  if (withdrawal) extras.push("withdrawal");
  return `Add ${extras.join(", ")}`;
}
