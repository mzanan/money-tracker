"use client";

import { useState } from "react";
import { Loader2Icon, MoreVerticalIcon, RefreshCwIcon } from "lucide-react";

import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useServerAction } from "@/hooks/useServerAction";
import {
  deleteIntegration,
  syncIntegration,
} from "@/lib/actions/integrations";
import { cn } from "@/lib/utils";
import type { IntegrationProvider, IntegrationSummary } from "@/types/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListRow } from "@/components/ui/listRow";

import { IntegrationDialog } from "./integrationDialog";

interface Props {
  provider: IntegrationProvider;
  label: string;
  integration: IntegrationSummary | null;
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
  const [open, setOpen] = useState(false);
  const { run, pending } = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();
  const connected = integration !== null;

  function handleSync() {
    run(() => syncIntegration(provider), {
      success: (data) =>
        `Imported ${data?.imported ?? 0} transaction${data?.imported === 1 ? "" : "s"}` +
        ((data?.skipped ?? 0) > 0 ? `, ${data?.skipped} skipped` : "") +
        ((data?.absorbed ?? 0) > 0
          ? `, ${data?.absorbed} merged from manual entries`
          : ""),
    });
  }

  function handleDisconnect() {
    run(() => deleteIntegration(provider), {
      success: `${label} disconnected`,
    });
  }

  return (
    <ListRow
      title={label}
      badge={
        <Badge
          variant={connected ? "secondary" : "outline"}
          size="xs"
          className={cn(connected && "text-income")}
        >
          {connected ? "Connected" : "Not connected"}
        </Badge>
      }
      meta={
        connected
          ? `Last sync · ${timeAgo(integration.lastSyncedAt)}`
          : "Connect to start syncing"
      }
    >
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
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${label} options`}
                  >
                    <MoreVerticalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => runAfterMenuClose(() => setOpen(true))}
                >
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
    </ListRow>
  );
}
