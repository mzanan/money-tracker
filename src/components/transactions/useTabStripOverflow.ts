"use client";

import { useEffect, useRef, useState } from "react";

export function useTabStripOverflow() {
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef(false);
  const labelWidthRef = useRef(0);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    const actions = actionsRef.current;
    if (!row || !scroller || !content || !actions) return;

    function measure() {
      if (!row || !scroller || !content || !actions) return;
      const label = actions.querySelector<HTMLElement>(
        "[data-collapsible-label]",
      );
      if (label && !compactRef.current && label.parentElement) {
        labelWidthRef.current =
          label.offsetWidth +
          (parseFloat(getComputedStyle(label.parentElement).columnGap) || 0);
      }
      const actionsWidth =
        actions.offsetWidth + (compactRef.current ? labelWidthRef.current : 0);
      const needed =
        (parseFloat(getComputedStyle(scroller).paddingLeft) || 0) +
        content.offsetWidth +
        actionsWidth;
      const next = needed > row.clientWidth;
      compactRef.current = next;
      setCompact(next);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(content);
    observer.observe(actions);
    return () => observer.disconnect();
  }, []);

  return { rowRef, scrollerRef, contentRef, actionsRef, compact };
}
