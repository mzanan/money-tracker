"use client";

import { Loader2Icon, SmartphoneIcon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import {
  generateIngestToken,
  revokeIngestToken,
} from "@/lib/actions/ingest";

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
  token: string | null;
  endpoint: string;
}

export function IngestPanel({ token, endpoint }: Props) {
  const { run, pending } = useServerAction();

  function handleGenerate() {
    run(() => generateIngestToken(), {
      success: token ? "New token generated" : "Token generated",
    });
  }

  function handleRevoke() {
    run(() => revokeIngestToken(), { success: "Token revoked" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SmartphoneIcon className="size-4" />
          Phone auto-import
          <Badge variant={token ? "secondary" : "outline"} size="xs">
            {token ? "Active" : "Off"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Forward Wise / Google Wallet notifications from your Android phone
          (via MacroDroid) and each payment lands here automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {token ? (
          <>
            <CopyField label="Endpoint URL" value={endpoint} />
            <CopyField label="Token (X-Ingest-Token header)" value={token} secret />

            <div className="text-muted-foreground grid gap-1.5 text-xs">
              <p className="text-foreground font-medium">
                MacroDroid setup (Android)
              </p>
              <ol className="grid list-decimal gap-1 pl-4">
                <li>
                  Install{" "}
                  <span className="text-foreground font-medium">
                    MacroDroid
                  </span>{" "}
                  from the Play Store and grant notification access when asked.
                </li>
                <li>
                  Add a macro → Trigger:{" "}
                  <span className="font-mono">Notification Received</span> →
                  Select applications →{" "}
                  <span className="text-foreground">Wise + Google Wallet</span>.
                </li>
                <li>
                  Action: <span className="font-mono">HTTP Request</span>,
                  method <span className="font-mono">POST</span>, URL = the
                  endpoint above.
                </li>
                <li>
                  Add header <span className="font-mono">X-Ingest-Token</span>{" "}
                  with the token above, content type{" "}
                  <span className="font-mono">application/json</span>, body:{" "}
                  <span className="font-mono">
                    {`{"app":"[app_name]","title":"[notification_title]","text":"[notification_text]"}`}
                  </span>{" "}
                  (the brackets are MacroDroid magic-text variables).
                </li>
                <li>
                  Test with any card payment — the entry should show up here
                  within seconds. Non-payment notifications are skipped
                  automatically.
                </li>
              </ol>
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
              Generate a token to connect your phone.
            </p>
            <Button size="sm" onClick={handleGenerate} disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              Generate token
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
