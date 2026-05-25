import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Money <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!resend) {
    // No API key configured: log to console so dev can still see the OTP/link.
    console.log(
      `[email] (no RESEND_API_KEY) to=${input.to} subject=${input.subject}\n${input.text ?? input.html}`,
    );
    return;
  }
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }
}
