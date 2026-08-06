"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";

import {
  countSignificantAmountChars,
  positionAfterSignificantAmountChars,
  sanitizeAmountDigits,
} from "@/lib/currency";

export function useAmountInput(
  value: string,
  onChange: (raw: string) => void,
  decimals: number,
) {
  const ref = useRef<HTMLInputElement>(null);
  const restoreDigitsRef = useRef<number | null>(null);

  useEffect(() => {
    const sanitized = sanitizeAmountDigits(value, decimals);
    if (sanitized !== value) onChange(sanitized);
  }, [value, decimals, onChange]);

  useLayoutEffect(() => {
    if (restoreDigitsRef.current === null || !ref.current) return;
    const pos = positionAfterSignificantAmountChars(
      ref.current.value,
      restoreDigitsRef.current,
    );
    ref.current.setSelectionRange(pos, pos);
    restoreDigitsRef.current = null;
  });

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const el = event.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === null || end === null || start !== end) return;

    if (
      event.key === "Backspace" &&
      start > 0 &&
      !/[\d.]/.test(el.value[start - 1])
    ) {
      event.preventDefault();
      const rawIndex = countSignificantAmountChars(el.value, start);
      if (rawIndex === 0) return;
      restoreDigitsRef.current = rawIndex - 1;
      onChange(
        sanitizeAmountDigits(
          value.slice(0, rawIndex - 1) + value.slice(rawIndex),
          decimals,
        ),
      );
    } else if (
      event.key === "Delete" &&
      end < el.value.length &&
      !/[\d.]/.test(el.value[end])
    ) {
      event.preventDefault();
      const rawIndex = countSignificantAmountChars(el.value, end);
      restoreDigitsRef.current = rawIndex;
      onChange(
        sanitizeAmountDigits(
          value.slice(0, rawIndex) + value.slice(rawIndex + 1),
          decimals,
        ),
      );
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const el = event.target;
    const cursor = el.selectionStart ?? el.value.length;
    restoreDigitsRef.current = countSignificantAmountChars(el.value, cursor);
    onChange(sanitizeAmountDigits(el.value, decimals));
  }

  return { ref, handleChange, handleKeyDown };
}
