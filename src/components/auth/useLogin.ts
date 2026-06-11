"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/authClient";

export type AuthMode = "sign-in" | "sign-up";

export function useLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleMode() {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const trimmedEmail = email.trim();
    const { error } =
      mode === "sign-in"
        ? await authClient.signIn.email({ email: trimmedEmail, password })
        : await authClient.signUp.email({
            email: trimmedEmail,
            password,
            name: trimmedEmail.split("@")[0],
          });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Authentication failed");
      return;
    }
    router.replace("/");
    router.refresh();
  }

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

  return {
    mode,
    toggleMode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    submit,
    signInWithGoogle,
  };
}
