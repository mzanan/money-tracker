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

            <div className="text-muted-foreground grid gap-1 text-xs">
              <p className="text-foreground font-medium">MacroDroid setup</p>
              <p>
                Trigger: <span className="font-mono">Notification Received</span>{" "}
                → apps Wise + Google Wallet.
              </p>
              <p>
                Action: <span className="font-mono">HTTP Request (POST)</span>{" "}
                to the endpoint, header{" "}
                <span className="font-mono">X-Ingest-Token</span>, JSON body{" "}
                <span className="font-mono">
                  {`{"app":"[app_name]","title":"[notification_title]","text":"[notification_text]"}`}
                </span>
                .
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
