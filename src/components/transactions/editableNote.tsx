"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { updateTransactionNote } from "@/lib/actions/transactions";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  note: string | null;
  className?: string;
};

const PLACEHOLDER = "Add a comment…";

export function EditableNote({ id, note, className }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTrimmed = note?.trim() ?? "";

  function startEdit() {
    setEditing(true);
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function commit(value: string) {
    const next = value.trim();
    if (next === currentTrimmed) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateTransactionNote(id, next || null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <input
          ref={inputRef}
          defaultValue={currentTrimmed}
          placeholder="Add a comment…"
          disabled={pending}
          maxLength={280}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className={cn(
            "border-primary/50 focus:border-primary min-w-0 flex-1 border-b bg-transparent text-sm leading-tight font-medium outline-none disabled:opacity-60",
            className,
          )}
        />
        {pending && (
          <Loader2Icon className="text-muted-foreground size-3 shrink-0 animate-spin" />
        )}
      </span>
    );
  }

  const isPlaceholder = !currentTrimmed;
  const display = currentTrimmed || PLACEHOLDER;

  return (
    <button
      type="button"
      onClick={startEdit}
      className={cn(
        "hover:text-foreground/70 -mx-1 min-w-0 flex-1 truncate rounded px-1 text-left text-sm leading-tight transition-colors",
        isPlaceholder
          ? "text-muted-foreground/70 italic"
          : "font-medium",
        className,
      )}
      aria-label={isPlaceholder ? "Add a comment" : "Edit comment"}
    >
      {display}
    </button>
  );
}
