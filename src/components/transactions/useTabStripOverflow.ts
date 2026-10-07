"use client";

import { useEffect, useRef, useState } from "react";

import { tabStripNeedsCompact } from "@/lib/tabStripOverflow";

export function useTabStripOverflow() {
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const accountLabelRef = useRef<HTMLSpanElement>(null);
  const importLabelRef = useRef<HTMLSpanElement>(null);
  const compactRef = useRef(false);
  const labelWidthsRef = useRef([0, 0]);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    const actions = actionsRef.current;
    if (!row || !scroller || !content || !actions) return;

    function measure() {
      if (!row || !scroller || !content || !actions) return;
      const labels = [accountLabelRef.current, importLabelRef.current];
      let hiddenLabelWidth = 0;
      labels.forEach((label, index) => {
        if (label?.parentElement && !compactRef.current) {
          labelWidthsRef.current[index] =
            label.offsetWidth +
            (parseFloat(getComputedStyle(label.parentElement).columnGap) || 0);
        }
        if (label) hiddenLabelWidth += labelWidthsRef.current[index];
      });
      const next = tabStripNeedsCompact({
        rowWidth: row.clientWidth,
        leadingPadding: parseFloat(getComputedStyle(scroller).paddingLeft) || 0,
        tabsWidth: content.offsetWidth,
        actionsWidth: actions.offsetWidth,
        hiddenLabelWidth: compactRef.current ? hiddenLabelWidth : 0,
      });
      compactRef.current = next;
      setCompact(next);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(content);
    observer.observe(actions);
    return () => observer.disconnect();
  }, []);

  return {
    rowRef,
    scrollerRef,
    contentRef,
    actionsRef,
    accountLabelRef,
    importLabelRef,
    compact,
  };
}
