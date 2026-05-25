import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Falls back to window.location.origin in the browser when undefined.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || undefined,
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
