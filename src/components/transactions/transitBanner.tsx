"use client";

import { PlaneIcon } from "lucide-react";

import { NoticeBanner } from "@/components/ui/noticeBanner";
import type { Movement } from "@/types/ledger";

import { useTransitBanner } from "./useTransitBanner";

export function TransitBanner({
  movements,
  onOpen,
}: {
  movements: Movement[];
  onOpen: () => void;
}) {
  const banner = useTransitBanner(movements);
  if (!banner) return null;

  return (
    <NoticeBanner
      icon={PlaneIcon}
      title={banner.title}
      detail={banner.detail}
      onClick={onOpen}
    />
  );
}
