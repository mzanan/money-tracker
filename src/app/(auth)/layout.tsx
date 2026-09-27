import { LandingShell } from "@/components/landing/landingShell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LandingShell showCta={false} mainClassName="bg-glow flex flex-col">
      {children}
    </LandingShell>
  );
}
