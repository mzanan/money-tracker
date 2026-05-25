import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboardingForm";
import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { getUser } from "@/lib/session";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const settings = await db
    .select({ onboarded_at: user_settings.onboarded_at })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (settings?.onboarded_at) {
    redirect("/");
  }

  return <OnboardingForm />;
}
