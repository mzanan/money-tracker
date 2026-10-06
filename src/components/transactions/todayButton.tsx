import { Button } from "@/components/ui/button";

export function TodayButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      Today
    </Button>
  );
}
