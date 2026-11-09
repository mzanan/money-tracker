import { Loader2Icon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";

export function DrawerActions({
  onCancel,
  onSubmit,
  submitLabel,
  pending = false,
  disabled = false,
  cancelDisabled = false,
  cancelLabel = "Cancel",
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  cancelDisabled?: boolean;
  cancelLabel?: string;
}) {
  return (
    <DrawerFooter className="flex-col-reverse gap-2 sm:flex-row">
      <Button
        type="button"
        variant="ghost"
        className="sm:flex-1"
        onClick={onCancel}
        disabled={cancelDisabled}
      >
        {cancelLabel}
      </Button>
      <Button
        className="sm:flex-1"
        disabled={pending || disabled}
        onClick={onSubmit}
      >
        {pending && <Loader2Icon className="animate-spin" />}
        {submitLabel}
      </Button>
    </DrawerFooter>
  );
}
