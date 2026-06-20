import { Brand } from "./brand";
import { ThemeToggle } from "./themeToggle";

export function PublicHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 backdrop-blur">
      <Brand />
      <ThemeToggle />
    </header>
  );
}
