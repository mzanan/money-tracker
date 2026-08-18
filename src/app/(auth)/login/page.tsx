import { redirect } from "next/navigation";

import { LoginCard } from "@/components/auth/loginCard";
import { getUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  return <LoginCard />;
}
