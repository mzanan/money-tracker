import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { db, schema } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      sendVerificationOTP: async ({ email, otp, type }) => {
        const subject =
          type === "sign-in"
            ? `Sign in to Money: ${otp}`
            : `Your verification code: ${otp}`;
        await sendEmail({
          to: email,
          subject,
          text: `Your code is ${otp}. It expires in 10 minutes.`,
          html: `<p>Your code is <strong style="font-size:1.4rem;letter-spacing:0.3em">${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
