"use client";

import { useTransition } from "react";
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

  async function run<T>(
    action: () => Promise<ActionResult<T>>,
    options: RunOptions<T> = {},
  ) {
    if (options.confirm && !(await confirm(options.confirm))) return;
    startTransition(async () => {
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
    });
  }

  return { run, pending };
}
