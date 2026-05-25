"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, MoreVerticalIcon, RefreshCwIcon } from "lucide-react";

import {
  deleteIntegration,
  syncIntegration,
} from "@/lib/actions/integrations";
import { cn } from "@/lib/utils";
import type { ApiIntegration, IntegrationProvider } from "@/types/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { IntegrationDialog } from "./integrationDialog";

interface Props {
  provider: IntegrationProvider;
  label: string;
  integration: ApiIntegration | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never synced";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function IntegrationRow({ provider, label, integration }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const connected = integration !== null;

  function handleSync() {
    startTransition(async () => {
      const result = await syncIntegration(provider);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { imported, skipped } = result.data!;
      toast.success(
        `Imported ${imported} transaction${imported === 1 ? "" : "s"}` +
          (skipped > 0 ? `, ${skipped} skipped` : ""),
      );
      router.refresh();
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await deleteIntegration(provider);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label} disconnected`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          <Badge
            variant={connected ? "secondary" : "outline"}
            className={cn("text-[10px]", connected && "text-income")}
          >
            {connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {connected
            ? `Last sync · ${timeAgo(integration.last_synced_at)}`
            : "Connect to start syncing"}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {connected ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={pending}
            >
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RefreshCwIcon />
              )}
              Sync
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${label} options`}
                >
                  <MoreVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setOpen(true)}>
                  Edit credentials
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={handleDisconnect}
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            Connect
          </Button>
        )}
      </div>

      <IntegrationDialog
        provider={provider}
        label={label}
        integration={integration}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
