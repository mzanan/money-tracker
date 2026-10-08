import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function SettingToggleCard({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={title}
        />
      </CardContent>
    </Card>
  );
}
