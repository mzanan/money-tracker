"use client";

import { Loader2Icon, WalletIcon } from "lucide-react";

import { useLogin } from "./useLogin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COPY = {
  "sign-in": {
    submit: "Sign in",
    switchPrompt: "No account yet?",
    switchAction: "Create one",
  },
  "sign-up": {
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
  },
} as const;

export function LoginCard() {
  const {
    mode,
    toggleMode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    submit,
    signInWithGoogle,
  } = useLogin();
  const copy = COPY[mode];

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm gap-6 p-6">
        <CardHeader className="items-center gap-2 p-0 text-center">
          <div className="bg-primary text-primary-foreground mb-1 flex size-12 items-center justify-center rounded-2xl">
            <WalletIcon className="size-6" />
          </div>
          <CardTitle className="text-xl">Money</CardTitle>
          <CardDescription className="text-sm">
            Track every coin across cash, exchange and bank exports.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 p-0">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={signInWithGoogle}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or
            <span className="bg-border h-px flex-1" />
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={loading || !email || password.length < 8}>
              {loading && <Loader2Icon className="animate-spin" />}
              {copy.submit}
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-xs">
            {copy.switchPrompt}{" "}
            <button
              type="button"
              className="text-foreground underline underline-offset-2"
              disabled={loading}
              onClick={toggleMode}
            >
              {copy.switchAction}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.49 11.49 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
