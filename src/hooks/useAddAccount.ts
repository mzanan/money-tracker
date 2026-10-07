"use client";

import { createAccount } from "@/lib/actions/accounts";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useServerAction } from "@/hooks/useServerAction";

export function useAddAccount(onAdded?: (source: string) => void) {
  const { run, pending } = useServerAction();
  const edit = useInlineEdit((name) => {
    if (!name) return;
    run(() => createAccount(name), {
      success: `Added ${name}`,
      onSuccess: (data) => {
        if (data) onAdded?.(data.source);
      },
    });
  });

  return { edit, pending };
}
