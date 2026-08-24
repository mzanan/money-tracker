import Link from "next/link";
import { KeyRoundIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NOTICE_CLASSES =
  "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors";

function NoticeContent({ feature }: { feature: string }) {
  return (
    <>
      <KeyRoundIcon className="size-3.5 shrink-0" />
      {feature} runs on your own AI key. Add it in Settings.
    </>
  );
}

export function ApiKeyRequiredNotice({
  feature,
  className,
}: {
  feature: string;
  className?: string;
}) {
  return (
    <Link href="/settings" className={cn(NOTICE_CLASSES, className)}>
      <NoticeContent feature={feature} />
    </Link>
  );
}

export function ApiKeyRequiredDialog({
  feature,
  trigger,
}: {
  feature: string;
  trigger?: React.ReactElement;
}) {
  const dialogTrigger = trigger ?? (
    <button type="button" className={NOTICE_CLASSES}>
      <NoticeContent feature={feature} />
    </button>
  );

  return (
    <Dialog>
      <DialogTrigger render={dialogTrigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API key required</DialogTitle>
          <DialogDescription>
            {feature} runs on your own AI key. Add it in Settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button asChild>
            <Link href="/settings?tab=assistant">Go to Settings</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
