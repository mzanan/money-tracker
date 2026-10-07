"use client";

import { useRouter } from "next/navigation";

import { useConfirm } from "@/components/providers/confirmProvider";
import { authClient } from "@/lib/authClient";
import { resetAnalytics } from "@/lib/consent";

export function useSignOut() {
  const router = useRouter();
  const confirm = useConfirm();

  return async function signOut() {
    if (
      !(await confirm("Sign out? You will need to sign in again with Google."))
    )
      return;
    await authClient.signOut();
    resetAnalytics();
    router.replace("/login");
    router.refresh();
  };
}
