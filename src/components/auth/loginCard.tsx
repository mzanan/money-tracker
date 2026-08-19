"use client";

import { Loader2Icon, WalletIcon } from "lucide-react";

import { GoogleIcon } from "./googleIcon";
import { useLogin } from "./useLogin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/passwordInput";

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
          <div className="bg-primary text-primary-foreground mx-auto mb-1 flex size-12 items-center justify-center rounded-2xl">
            <WalletIcon className="size-6" />
          </div>
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
              <PasswordInput
                id="password"
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
