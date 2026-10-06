"use client";

import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/authClient";

export function useLogin() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
    if (error) {
      setLoading(false);
      toast.error(error.message ?? "Google sign-in failed");
    }
  }

  return { loading, signInWithGoogle };
}
