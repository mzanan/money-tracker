"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyField({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          readOnly
          value={value}
          type={revealed ? "text" : "password"}
          className="font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        {secret && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={revealed ? "Hide" : "Reveal"}
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy ${label}`}
          onClick={copy}
        >
          {copied ? <CheckIcon className="text-income" /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  );
}
