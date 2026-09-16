"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  inline = false,
  className,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  inline?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        inline ? "gap-1.5" : "justify-between",
        className,
      )}
    >
      <Label htmlFor={id} className={cn(inline && "text-xs")}>
        {label}
      </Label>
      <Switch
        id={id}
        size={inline ? "sm" : "default"}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
