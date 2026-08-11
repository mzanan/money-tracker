"use client";

import {
  ImageUpIcon,
  Loader2Icon,
  ReceiptTextIcon,
  SmartphoneIcon,
} from "lucide-react";

import type { ImageImportMode } from "@/lib/imageExtract";

import {
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { IconCircle } from "@/components/ui/iconCircle";
import { TappableRow } from "@/components/ui/tappableRow";
import { ImageExtractLoading } from "@/components/screenshot/imageExtractLoading";
import { ScreenshotImporter } from "@/components/screenshot/screenshotImporter";

import { useImportFromImage } from "./useImportFromImage";

const OPTIONS: Array<{
  mode: ImageImportMode;
  label: string;
  hint: string;
  icon: typeof SmartphoneIcon;
}> = [
  {
    mode: "screenshot",
    label: "Phone screenshot",
    hint: "Notification or bank alert capture",
    icon: SmartphoneIcon,
  },
  {
    mode: "receipt",
    label: "Receipt photo",
    hint: "AI reads the total and merchant",
    icon: ReceiptTextIcon,
  },
];

export function ImportFromImage({
  existingSources,
}: {
  existingSources: string[];
}) {
  const {
    fileInputRef,
    menuOpen,
    setMenuOpen,
    payload,
    setPayload,
    extracting,
    extractingMode,
    cancelExtract,
    pickMode,
    handleFileChange,
  } = useImportFromImage();

  const freeAiNotice = (
    <p className="text-muted-foreground rounded-xl border px-3 py-2 text-xs">
      Image import runs on free AI tiers: it can be slow, or temporarily
      unavailable when the shared quota runs out. Adding a transaction manually
      always works.
    </p>
  );

  const trigger = (
    <button
      type="button"
      disabled={extracting}
      className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 py-3 text-sm font-medium transition-colors disabled:opacity-50"
    >
      {extracting ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <ImageUpIcon className="size-3.5" />
      )}
      Import from image
    </button>
  );

  return (
    <>
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerTrigger render={trigger} />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader className="pb-2">
            <DrawerTitle>Import from image</DrawerTitle>
            <DrawerDescription className="sr-only">
              Choose how to import a transaction from an image.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-1 px-4 pb-8">
            <div className="pb-2">{freeAiNotice}</div>
            {OPTIONS.map((option) => (
              <TappableRow
                key={option.mode}
                type="button"
                onClick={() => pickMode(option.mode)}
              >
                <IconCircle className="bg-surface-2 text-foreground">
                  <option.icon className="size-4" />
                </IconCircle>
                <span>
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {option.hint}
                  </span>
                </span>
              </TappableRow>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <Drawer
        size="lg"
        open={extracting || payload !== null}
        onOpenChange={(open, eventDetails) => {
          if (!open && eventDetails.reason !== "close-press") {
            eventDetails.cancel();
            return;
          }
          if (!open) {
            if (extracting) cancelExtract();
            setPayload(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerCloseButton className="inline-flex" />
          <DrawerHeader>
            <DrawerTitle>
              {(payload?.mode ?? extractingMode) === "receipt"
                ? "Import from receipt"
                : "Import from screenshot"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Review the extracted amounts before saving.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-4 overflow-y-auto px-4 pb-8">
            {extracting && (
              <ImageExtractLoading
                mode={extractingMode}
                onCancel={cancelExtract}
              />
            )}
            {!extracting && payload && (
              <ScreenshotImporter
                mode={payload.mode}
                initialItems={payload.items}
                initialIgnored={payload.ignored}
                initialCandidates={payload.candidates}
                existingSources={existingSources}
                onDone={() => setPayload(null)}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
