"use client";

import {
  ImageUpIcon,
  Loader2Icon,
  ReceiptTextIcon,
  SmartphoneIcon,
} from "lucide-react";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ImageImportMode } from "@/lib/imageExtract";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconCircle } from "@/components/ui/iconCircle";
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
  const isMobile = useMediaQuery("(max-width: 639px)");
  const {
    fileInputRef,
    menuOpen,
    setMenuOpen,
    payload,
    setPayload,
    extracting,
    pickMode,
    handleFileChange,
  } = useImportFromImage();

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
      {isMobile ? (
        <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Import from image</DrawerTitle>
              <DrawerDescription className="sr-only">
                Choose how to import a transaction from an image.
              </DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-1 px-4 pb-8">
              {OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => pickMode(option.mode)}
                  className="hover:bg-surface-2/60 flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
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
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.mode}
                onSelect={() => pickMode(option.mode)}
              >
                <option.icon />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <Dialog
        open={payload !== null}
        onOpenChange={(open) => {
          if (!open) setPayload(null);
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {payload?.mode === "receipt"
                ? "Import from receipt"
                : "Import from screenshot"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Review the extracted amounts before saving.
            </DialogDescription>
          </DialogHeader>
          {payload && (
            <ScreenshotImporter
              mode={payload.mode}
              initialItems={payload.items}
              initialIgnored={payload.ignored}
              initialCandidates={payload.candidates}
              existingSources={existingSources}
              onDone={() => setPayload(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
