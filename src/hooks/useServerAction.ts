"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useConfirm } from "@/components/providers/confirmProvider";

import type { ActionResult } from "@/lib/actions/transactions";

interface RunOptions<T> {
  confirm?: string;
  success?: string | ((data: T | undefined) => string);
  onSuccess?: (data: T | undefined) => void;
  refresh?: boolean;
}

export function useServerAction() {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const runningRef = useRef(false);

  async function run<T>(
    action: () => Promise<ActionResult<T>>,
    options: RunOptions<T> = {},
  ) {
    if (runningRef.current) return;
    runningRef.current = true;

    if (options.confirm && !(await confirm(options.confirm))) {
      runningRef.current = false;
      return;
    }

    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (options.success) {
          toast.success(
            typeof options.success === "function"
              ? options.success(result.data)
              : options.success,
          );
        }
        options.onSuccess?.(result.data);
        if (options.refresh !== false) router.refresh();
      } finally {
        runningRef.current = false;
      }
    });
  }

  return { run, pending };
}
