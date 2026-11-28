"use client";

import { useRef, useState } from "react";

type Mode = "file" | "paste";

export function useSheetInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("file");
  const [pasted, setPasted] = useState("");

  function reset() {
    setPasted("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return { inputRef, mode, setMode, pasted, setPasted, reset };
}
