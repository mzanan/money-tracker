"use client";

import { useState } from "react";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { BellPlusIcon } from "lucide-react";

import { labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Transaction } from "@/types/db";

type Frequency = "NONE" | "WEEKLY" | "MONTHLY" | "YEARLY";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "NONE", label: "One-shot" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

type Props = {
  tx: Transaction;
  defaultTitle: string;
};

export function ReminderButton({ tx, defaultTitle }: Props) {
  const [open, setOpen] = useState(false);

  const initialDate = format(
    addMonths(parseISO(tx.occurred_on), 1),
    "yyyy-MM-dd",
  );

  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(initialDate);
  const [freq, setFreq] = useState<Frequency>("MONTHLY");

  function reset() {
    setTitle(defaultTitle);
    setDate(initialDate);
    setFreq("MONTHLY");
  }

  function openCalendar() {
    const url = buildGcalUrl({
      title: title.trim() || defaultTitle,
      date,
      freq,
      description: buildDescription(tx),
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground -mr-0.5"
          aria-label="Add reminder"
        >
          <BellPlusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remind me</DialogTitle>
          <DialogDescription>
            Opens Google Calendar with the event pre-filled. Nothing is stored
            here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reminder-date">Date</Label>
              <Input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-freq">Repeats</Label>
              <Select
                value={freq}
                onValueChange={(v) => setFreq(v as Frequency)}
              >
                <SelectTrigger id="reminder-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={openCalendar} disabled={!title.trim() || !date}>
            Open in Google Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildGcalUrl({
  title,
  date,
  freq,
  description,
}: {
  title: string;
  date: string;
  freq: Frequency;
  description: string;
}): string {
  const start = date.replaceAll("-", "");
  const end = format(addDays(parseISO(date), 1), "yyyyMMdd");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: description,
  });
  if (freq !== "NONE") {
    params.append("recur", `RRULE:FREQ=${freq}`);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildDescription(tx: Transaction): string {
  const lines = [
    `Last paid: ${formatMoney(tx.amount_original, tx.currency_original)} on ${tx.occurred_on}`,
    `Source: ${labelForSource(tx.source)}`,
  ];
  if (tx.category) lines.push(`Category: ${tx.category}`);
  return lines.join("\n");
}
