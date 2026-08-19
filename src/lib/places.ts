import type { Location } from "@/types/db";

export const NO_PLACE_LABEL = "No place";

export function placeOf(
  occurredOn: string,
  places: ReadonlyArray<Location>,
): string {
  let best: Location | null = null;
  for (const place of places) {
    if (place.start_date && occurredOn < place.start_date) continue;
    if (place.end_date && occurredOn > place.end_date) continue;
    if (!best || (place.start_date ?? "") > (best.start_date ?? "")) {
      best = place;
    }
  }
  return best?.label ?? NO_PLACE_LABEL;
}

export function locationRangeLabel(place: Location): string {
  if (place.start_date && place.end_date) {
    return `${place.start_date} to ${place.end_date}`;
  }
  if (place.start_date) return `from ${place.start_date}`;
  if (place.end_date) return `until ${place.end_date}`;
  return "any date";
}
