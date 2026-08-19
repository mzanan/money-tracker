"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/authClient";

export function usePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [pending, setPending] = useState(false);

  const mismatch =
    confirmTouched && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sameAsCurrent =
    newPassword.length > 0 &&
    currentPassword.length > 0 &&
    newPassword === currentPassword;
  const canSubmit =
    !pending &&
    !!currentPassword &&
    newPassword.length >= 8 &&
    !sameAsCurrent &&
    !mismatch;

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setConfirmTouched(true);
      toast.error("New passwords don't match");
      return;
    }
    if (sameAsCurrent) {
      toast.error("New password must be different from the current one");
      return;
    }

    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
    });
    setPending(false);

    if (error) {
      toast.error(error.message ?? "Couldn't change password");
      return;
    }

    toast.success("Password updated");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setConfirmTouched(false);
  }

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    onConfirmBlur: () => setConfirmTouched(true),
    mismatch,
    sameAsCurrent,
    canSubmit,
    pending,
    submit,
  };
}
