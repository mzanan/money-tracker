import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shiftYearMonth } from "@/lib/dates";

interface Props {
  yearMonth: string;
  hasOlder: boolean;
  hasNewer: boolean;
}

export function MonthNav({ yearMonth, hasOlder, hasNewer }: Props) {
  const prev = shiftYearMonth(yearMonth, -1);
  const next = shiftYearMonth(yearMonth, 1);

  return (
    <div className="flex items-center gap-0.5">
      {hasOlder ? (
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
        >
          <Link href={`/month/${prev}`}>
            <ChevronLeftIcon />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </Button>
      )}
      {hasNewer ? (
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
        >
          <Link href={`/month/${next}`}>
            <ChevronRightIcon />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </Button>
      )}
    </div>
  );
}
