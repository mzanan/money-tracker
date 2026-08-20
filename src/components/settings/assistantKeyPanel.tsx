"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/passwordInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_PROVIDERS, type AiProvider } from "@/lib/constants/aiProviders";

import { useAssistantKeyForm } from "./useAssistantKeyForm";

interface Props {
  initialProvider: AiProvider | null;
  initialModel: string | null;
  hasKey: boolean;
}

export function AssistantKeyPanel({
  initialProvider,
  initialModel,
  hasKey,
}: Props) {
  const {
    provider,
    setProvider,
    model,
    setModel,
    apiKey,
    setApiKey,
    defaultModel,
    pending,
    handleSubmit,
    handleRemove,
  } = useAssistantKeyForm({ initialProvider, initialModel });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4" />
          Assistant model
          <Badge variant={hasKey ? "secondary" : "outline"} size="xs">
            {hasKey ? "Own key" : "Not configured"}
          </Badge>
        </CardTitle>
        <CardDescription>
          The assistant and image import both run on your own API key. Add
          one below to use them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="flex gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="assistant-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as AiProvider)}
              >
                <SelectTrigger
                  id="assistant-provider"
                  className="bg-surface-2 h-9 w-full border-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_PROVIDERS).map(([id, { label }]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="assistant-model">Model</Label>
              <Input
                id="assistant-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={defaultModel}
                className="bg-surface-2 h-9 border-none"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="assistant-key">API key</Label>
            <PasswordInput
              id="assistant-key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={hasKey ? "••••••••" : "Paste your API key"}
              autoComplete="off"
              required
              className="bg-surface-2 h-9 border-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {hasKey ? "Replace key" : "Save key"}
            </Button>
            {hasKey && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={pending}
              >
                Remove
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
