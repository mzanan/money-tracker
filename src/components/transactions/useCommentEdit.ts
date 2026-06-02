"use client";

import { updateTransactionComment } from "@/lib/actions/transactions";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useServerAction } from "@/hooks/useServerAction";

export function useCommentEdit(id: string, comment: string | null) {
  const { run, pending } = useServerAction();
  const current = comment?.trim() ?? "";

  const edit = useInlineEdit((next) => {
    if (next === current) return;
    run(() => updateTransactionComment(id, next || null));
  });

  return {
    editing: edit.editing,
    inputProps: edit.inputProps,
    submit: edit.submit,
    pending,
    current,
    start: () => edit.start(current),
  };
}
