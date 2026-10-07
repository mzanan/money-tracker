"use client";

import { ErrorFallback } from "@/components/layout/errorFallback";

export default function Error({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  return <ErrorFallback retry={unstable_retry} />;
}
