"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorText } from "@/components/ui/errorText";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/passwordInput";

import { usePasswordForm } from "./usePasswordForm";

export function PasswordCard() {
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    onConfirmBlur,
    mismatch,
    sameAsCurrent,
    canSubmit,
    pending,
    submit,
  } = usePasswordForm();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change the password for this account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              aria-invalid={sameAsCurrent}
            />
            {sameAsCurrent && (
              <ErrorText>Must be different from the current password</ErrorText>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={onConfirmBlur}
              required
              minLength={8}
              aria-invalid={mismatch}
            />
            {mismatch && <ErrorText>Passwords don&apos;t match</ErrorText>}
          </div>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {pending && <Loader2Icon className="animate-spin" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
