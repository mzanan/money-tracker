import Link from "next/link";

import { LandingContainer } from "@/components/landing/landingContainer";
import { LandingShell } from "@/components/landing/landingShell";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";

export default function NotFound() {
  return (
    <LandingShell mainClassName="bg-glow flex flex-col">
      <LandingContainer className="grid flex-1 content-center justify-items-center gap-4 py-16 text-center">
        <p className="text-eyebrow">404</p>
        <Heading as="h1" size="display" className="text-4xl sm:text-5xl">
          Page not found
        </Heading>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you are looking for does not exist or was moved.
        </p>
        <Button asChild size="xl" className="mt-2">
          <Link href="/">Back to Money</Link>
        </Button>
      </LandingContainer>
    </LandingShell>
  );
}
