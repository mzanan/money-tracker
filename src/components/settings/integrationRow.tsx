"use client";

import { Loader2Icon, MoreVerticalIcon, RefreshCwIcon } from "lucide-react";

import { timeAgo } from "@/lib/dates";
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
import { useIntegrationRow } from "./useIntegrationRow";

interface Props {
  provider: IntegrationProvider;
  label: string;
  integration: IntegrationSummary | null;
}

export function IntegrationRow({ provider, label, integration }: Props) {
  const { pending, dialog, connected, handleSync, handleDisconnect } =
    useIntegrationRow({ provider, label, integration });

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
        integration
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
                <DropdownMenuItem onSelect={() => dialog.openDialog()}>
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
          <Button size="sm" onClick={() => dialog.openNow()}>
            Connect
          </Button>
        )}
      </div>

      {dialog.mounted && (
        <IntegrationDialog
          key={dialog.key}
          provider={provider}
          label={label}
          integration={integration}
          open={dialog.open}
          onOpenChange={dialog.setOpen}
        />
      )}
    </ListRow>
  );
}
