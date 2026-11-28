import { eq } from "drizzle-orm";

import { forUser } from "@/lib/db/scope";
import { locations } from "@/lib/db/schema";
import type { Location } from "@/types/db";

export async function listLocations(userId: string): Promise<Location[]> {
  return forUser(userId).selectFrom(locations);
}

export async function insertLocation(
  userId: string,
  values: {
    label: string;
    start_date: string | null;
    end_date: string | null;
  },
): Promise<void> {
  await forUser(userId).insert(locations, values);
}

export async function deleteLocationById(
  userId: string,
  id: string,
): Promise<void> {
  await forUser(userId).delete(locations, eq(locations.id, id));
}
