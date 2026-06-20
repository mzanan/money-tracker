import { PublicHeader } from "@/components/layout/publicHeader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      {children}
    </div>
  );
}
