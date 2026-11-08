import { BellOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StopReminderButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="justify-self-start"
    >
      <BellOffIcon />
      Stop reminder
    </Button>
  );
}
