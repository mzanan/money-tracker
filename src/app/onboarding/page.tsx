import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboardingForm";
import { getUserSettings } from "@/lib/data/userSettings";
import { getUser } from "@/lib/session";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const settings = await getUserSettings(user.id);

  if (settings?.onboarded_at) {
    redirect("/");
  }

  return <OnboardingForm />;
}
