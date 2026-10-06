import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/appShell";
import { getUser, SESSION_EXPIRED_PATH } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect(SESSION_EXPIRED_PATH);
  }

  return <AppShell user={user}>{children}</AppShell>;
}
