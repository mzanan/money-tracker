"use client";

import { CalendarIcon, Loader2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import {
  generateCalendarToken,
  revokeCalendarToken,
} from "@/lib/actions/calendar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyField } from "@/components/ui/copyField";

interface Props {
  feedUrl: string | null;
}

export function CalendarFeedPanel({ feedUrl }: Props) {
  const { run, pending } = useServerAction();

  function handleGenerate() {
    run(() => generateCalendarToken(), {
      success: feedUrl ? "New URL generated" : "URL generated",
    });
  }

  function handleRevoke() {
    run(() => revokeCalendarToken(), {
      success: "URL revoked",
      confirm:
        "Revoke this feed URL? Any calendar app subscribed to it will stop receiving updates.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="size-4" />
          Calendar feed
          <Badge variant={feedUrl ? "secondary" : "outline"} size="xs">
            {feedUrl ? "Active" : "Off"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Subscribe Google Calendar, iOS Calendar or Outlook to your reminders.
          Read-only — paying a reminder in the app advances the next due date in
          the feed.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {feedUrl ? (
          <>
            <CopyField label="Feed URL" value={feedUrl} secret />

            <div className="text-muted-foreground grid gap-1 text-xs">
              <p className="text-foreground font-medium">
                Google Calendar setup
              </p>
              <p>
                On the web: Other calendars →{" "}
                <span className="font-mono">+</span> → From URL → paste this
                feed.
              </p>
              <p>
                Google refreshes subscribed feeds roughly every 12-24 hours, so
                changes may take a day to appear.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={pending}
              >
                {pending && <Loader2Icon className="animate-spin" />}
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevoke}
                disabled={pending}
              >
                Revoke
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Generate a URL to subscribe your calendar app.
            </p>
            <Button size="sm" onClick={handleGenerate} disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              Generate URL
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
