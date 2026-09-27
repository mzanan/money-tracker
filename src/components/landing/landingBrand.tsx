"use client";

import { Brand } from "@/components/layout/brand";

import { useScrollToTop } from "./useScrollToTop";

export function LandingBrand() {
  const handleClick = useScrollToTop();
  return <Brand href="/" showBeta={false} onClick={handleClick} />;
}
