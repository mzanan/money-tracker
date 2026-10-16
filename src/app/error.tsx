"use client";

import { ErrorFallback } from "@/components/layout/errorFallback";

export default function Error({
  retry,
}: {
  retry: () => void;
}) {
  return <ErrorFallback retry={retry} />;
}
