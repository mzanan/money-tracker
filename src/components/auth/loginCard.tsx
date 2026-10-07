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
import { Heading } from "@/components/ui/heading";
import { enterUpClasses } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function LoginCard() {
  const { loading, signInWithGoogle } = useLogin();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className={cn("w-full max-w-sm gap-6 p-6", enterUpClasses)}>
        <CardHeader className="items-center gap-2 p-0 text-center">
          <div className="bg-primary text-primary-foreground mx-auto mb-1 flex size-12 items-center justify-center rounded-2xl">
            <WalletIcon className="size-6" />
          </div>
          <Heading as="h1">Sign in to Money</Heading>
          <CardDescription className="text-sm">
            Track every coin across cash, exchange and bank exports.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 p-0">
          <Button
            type="button"
            variant="outline"
            size="xl"
            disabled={loading}
            onClick={signInWithGoogle}
          >
            {loading ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
