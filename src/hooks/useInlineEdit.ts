"use client";

import { useState } from "react";

export function useInlineEdit(onSubmit: (value: string) => void) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  function start(current: string) {
    setValue(current);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  function submit() {
    setEditing(false);
    onSubmit(value.trim());
  }

  const inputProps = {
    value,
    autoFocus: true,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue(event.target.value),
    onFocus: (event: React.FocusEvent<HTMLInputElement>) =>
      event.currentTarget.select(),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    },
  };

  return { editing, value, setValue, start, cancel, submit, inputProps };
}
