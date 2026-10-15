interface CloseWatcher extends EventTarget {
  onclose: ((event: Event) => void) | null;
  oncancel: ((event: Event) => void) | null;
  requestClose(): void;
  close(): void;
  destroy(): void;
}

declare const CloseWatcher: {
  prototype: CloseWatcher;
  new (): CloseWatcher;
};
