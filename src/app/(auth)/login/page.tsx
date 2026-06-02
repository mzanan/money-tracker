"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, Loader2Icon, WalletIcon } from "lucide-react";

import { authClient } from "@/lib/authClient";
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

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Could not send code");
      return;
    }
    toast.success("We sent a 6-digit code to your email");
    setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: code.trim(),
    });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Invalid code");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm gap-6 p-6">
        <CardHeader className="items-center gap-2 p-0 text-center">
          <div className="bg-primary text-primary-foreground mb-1 flex size-12 items-center justify-center rounded-2xl">
            <WalletIcon className="size-6" />
          </div>
          <CardTitle className="text-xl">Money</CardTitle>
          <CardDescription className="text-sm">
            {step === "email"
              ? "Track every coin across cash, exchange and bank exports."
              : `We sent a 6-digit code to ${email}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {step === "email" ? (
            <form onSubmit={sendCode} className="grid gap-4">
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
              <Button type="submit" disabled={loading || !email}>
                {loading && <Loader2Icon className="animate-spin" />}
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  required
                  autoFocus
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>
              <Button type="submit" disabled={loading || code.length < 6}>
                {loading && <Loader2Icon className="animate-spin" />}
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setCode("");
                  setStep("email");
                }}
              >
                <ArrowLeftIcon /> Change email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
