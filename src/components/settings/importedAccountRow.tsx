"use client";

import { CheckIcon, Loader2Icon, MoreVerticalIcon, XIcon } from "lucide-react";

import {
  removeAccount,
  setAccountCurrency,
  upsertAccountLabel,
} from "@/lib/actions/accounts";
import { setSourceArchived } from "@/lib/actions/settings";
import { deleteSource } from "@/lib/actions/sources";
import { kindOfSource, syncStatusLabel } from "@/lib/constants/sources";
import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import type { IntegrationSummary } from "@/types/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/listRow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MULTI_CURRENCY_VALUE = "__multi__";

interface Props {
  source: string;
  label: string;
  count: number;
  hasAccount: boolean;
  currency: string | null;
  integration: IntegrationSummary | null;
}

export function ImportedAccountRow({
  source,
  label,
  count,
  hasAccount,
  currency,
  integration,
}: Props) {
  const settings = useSettings();
  const { run, pending } = useServerAction();
  const currencyAction = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();
  const reserved = kindOfSource(source) !== "csv";
  const archived = (settings.archived_sources ?? []).includes(source);

  function handleUnarchive() {
    run(() => setSourceArchived(source, false), { success: "Tab restored" });
  }

  function handleCurrencyChange(value: string) {
    currencyAction.run(
      () => setAccountCurrency(source, value === MULTI_CURRENCY_VALUE ? null : value),
      { success: "Currency updated" },
    );
  }

  const edit = useInlineEdit((next) => {
    if (!next || next === label) return;
    run(() => upsertAccountLabel(source, next), {
      success: `Renamed to ${next}`,
    });
  });

  function handleRemoveAccount() {
    run(() => removeAccount(source), {
      confirm:
        count > 0
          ? `Remove the "${label}" label? Transactions are kept, the name falls back to a default.`
          : undefined,
      success: "Account removed",
    });
  }

  function handleDeleteAll() {
    run(() => deleteSource(source), {
      confirm: `Delete all ${count} transaction${count === 1 ? "" : "s"} from ${label}? This cannot be undone.`,
      success: (data) => `Deleted ${data?.deleted ?? 0} transactions`,
    });
  }

  if (edit.editing) {
    return (
      <div className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
        <Input
          {...edit.inputProps}
          disabled={pending}
          className="h-8 text-sm"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Save"
          disabled={pending}
          onClick={edit.submit}
        >
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <CheckIcon className="text-income" />
          )}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Cancel"
          disabled={pending}
          onClick={edit.cancel}
        >
          <XIcon />
        </Button>
      </div>
    );
  }

  return (
    <ListRow
      title={label}
      badge={
        <>
          {kindOfSource(source) === "api" && (
            <Badge variant="outline" size="xs">
              {syncStatusLabel({
                connected: integration !== null,
                autoSync: integration?.autoSync ?? false,
                archived,
              })}
            </Badge>
          )}
          {archived && (
            <Badge variant="secondary" size="xs">
              Archived
            </Badge>
          )}
        </>
      }
      meta={
        count > 0
          ? `${count} transaction${count === 1 ? "" : "s"}`
          : "No transactions yet"
      }
    >
      {archived && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleUnarchive}
          disabled={pending}
        >
          Unarchive
        </Button>
      )}
      {!reserved && (
        <Select
          value={currency ?? MULTI_CURRENCY_VALUE}
          onValueChange={handleCurrencyChange}
          disabled={currencyAction.pending}
        >
          <SelectTrigger
            size="sm"
            className="w-28"
            aria-label={`${label} currency`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MULTI_CURRENCY_VALUE}>Multi-currency</SelectItem>
            {settings.currencies.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={`${label} options`}
            >
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <MoreVerticalIcon />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {!reserved && (
            <DropdownMenuItem onSelect={() => edit.start(label)}>
              Rename
            </DropdownMenuItem>
          )}
          {!reserved && hasAccount && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => runAfterMenuClose(handleRemoveAccount)}
            >
              Remove account
            </DropdownMenuItem>
          )}
          {count > 0 && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => runAfterMenuClose(handleDeleteAll)}
            >
              Delete all transactions
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </ListRow>
  );
}
