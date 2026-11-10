"use client";

import {
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { countFittingItems } from "@/lib/overflowFit";

export const OVERFLOW_ITEM_ATTR = "data-overflow-item";

export function useOverflowRow(items: ReactNode[]) {
  const itemKeys = items.map((item, index) =>
    isValidElement(item) ? String(item.key) : String(index),
  );
  const rowRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(itemKeys.length);
  const [measured, setMeasured] = useState(false);
  const itemsSignature = itemKeys.join("\u0000");

  useLayoutEffect(() => {
    const row = rowRef.current;
    const counter = counterRef.current;
    if (!row || !counter) return;

    const queryItems = () =>
      Array.from(
        row.querySelectorAll<HTMLElement>(`:scope > [${OVERFLOW_ITEM_ATTR}]`),
      );

    function measure() {
      if (!row || !counter) return;
      setMeasured(true);
      setVisibleCount(
        countFittingItems({
          containerWidth: row.clientWidth,
          itemWidths: queryItems().map((item) => item.offsetWidth),
          gap: parseFloat(getComputedStyle(row).columnGap) || 0,
          counterWidth: counter.offsetWidth,
        }),
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    queryItems().forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [itemsSignature]);

  return { rowRef, counterRef, visibleCount, measured, itemKeys };
}
