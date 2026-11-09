"use client";

import { ChevronLeftIcon, Loader2Icon } from "lucide-react";

import { AmountField } from "@/components/ui/amountCurrencyField";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/dateField";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListRow } from "@/components/ui/listRow";
import { ON_HOLD_HINT } from "@/lib/accountPurpose";
import type { HeldRow } from "@/lib/transactionDisplay";
import { cn } from "@/lib/utils";
import type { Movement } from "@/types/ledger";

import { AccountSelect } from "./accountSelect";
import { useOnHoldDrawer } from "./useOnHoldDrawer";

export function OnHoldDrawer({
  rows,
  movements,
  mask,
  open,
  onOpenChange,
}: {
  rows: HeldRow[];
  movements: ReadonlyArray<Movement>;
  mask: (text: string) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const panel = useOnHoldDrawer({ movements, rows });

  return (
    <Drawer size="sm" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          {panel.row ? (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit"
              onClick={panel.back}
            >
              <ChevronLeftIcon />
              On hold
            </Button>
          ) : null}
          <DrawerTitle>{panel.row?.label ?? "On hold"}</DrawerTitle>
          <DrawerDescription>
            {panel.row ? `${mask(panel.row.amount)} on hold` : ON_HOLD_HINT}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          {panel.row ? (
            <div className="grid gap-5">
              <div className="grid divide-y">
                {panel.history.map((entry) => (
                  <ListRow key={entry.id} title={entry.label} meta={entry.date}>
                    <span
                      className={cn(
                        "shrink-0 text-sm tabular-nums",
                        entry.positive ? "text-income" : "text-foreground",
                      )}
                    >
                      {mask(entry.amount)}
                    </span>
                  </ListRow>
                ))}
              </div>
              <div className="grid gap-3">
                <p className="text-sm font-medium">Record a return</p>
                <div className="flex items-end gap-2">
                  <AmountField
                    id="held-received"
                    label={`Received (${panel.currency})`}
                    value={panel.received}
                    onChange={panel.setReceived}
                    currency={panel.currency}
                  />
                  <div className="grid flex-1 gap-1.5">
                    <Label htmlFor="held-destination">Into</Label>
                    <AccountSelect
                      id="held-destination"
                      sources={panel.destinations}
                      value={panel.destination}
                      onValueChange={panel.setDestination}
                    />
                  </div>
                </div>
                <AmountField
                  id="held-withheld"
                  label={`Withheld (${panel.currency}), optional`}
                  value={panel.withheld}
                  onChange={panel.setWithheld}
                  currency={panel.currency}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="held-withheld-note">
                    What was withheld, optional
                  </Label>
                  <Input
                    id="held-withheld-note"
                    value={panel.withheldNote}
                    onChange={(event) =>
                      panel.setWithheldNote(event.target.value)
                    }
                    placeholder="Electricity, water…"
                    className="bg-surface-2 h-9 border-none"
                  />
                </div>
                <DateField
                  id="held-date"
                  label="Date"
                  value={panel.date}
                  onChange={panel.setDate}
                />
              </div>
            </div>
          ) : (
            <div className="grid divide-y">
              {rows.map((row) => (
                <button
                  key={row.source}
                  type="button"
                  onClick={() => panel.select(row.source)}
                  className="hover:bg-muted/50 -mx-2 rounded-lg px-2 text-left transition-colors"
                >
                  <ListRow title={row.label} meta={row.meta}>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {mask(row.amount)}
                    </span>
                  </ListRow>
                </button>
              ))}
            </div>
          )}
        </DrawerBody>
        {panel.row ? (
          <DrawerFooter>
            <Button disabled={panel.pending} onClick={panel.submit}>
              {panel.pending && <Loader2Icon className="animate-spin" />}
              Record return
            </Button>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
