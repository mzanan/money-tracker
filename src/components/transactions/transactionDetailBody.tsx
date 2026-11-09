import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
} from "lucide-react";

import { IconCircle } from "@/components/ui/iconCircle";
import { TagChip } from "@/components/ui/tagChip";
import type {
  DetailDirection,
  TransactionDetail,
} from "@/lib/transactionDetail";
import { cn } from "@/lib/utils";

import copy from "./transactionDetail.json";
import { TransactionDetailRows } from "./transactionDetailRows";

const DIRECTION_ICONS: Record<DetailDirection, typeof ArrowUpRightIcon> = {
  out: ArrowUpRightIcon,
  in: ArrowDownLeftIcon,
  move: ArrowLeftRightIcon,
};

export function TransactionDetailBody({
  detail,
  mask,
}: {
  detail: TransactionDetail;
  mask: (text: string) => string;
}) {
  const Icon = DIRECTION_ICONS[detail.direction];

  return (
    <div className="grid gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <IconCircle className="bg-surface-2 text-foreground">
          <Icon className="size-5" />
        </IconCircle>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{detail.title}</p>
          <p className="text-muted-foreground text-xs">{detail.typeLabel}</p>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p
            className={cn(
              "text-sm font-semibold",
              detail.incoming && "text-income",
            )}
          >
            {mask(detail.primary)}
          </p>
          {detail.secondary && (
            <p className="text-muted-foreground text-xs">
              {mask(detail.secondary)}
            </p>
          )}
        </div>
      </div>
      <div className="border-border grid gap-4 border-t pt-4">
        <p className="text-sm font-semibold">{copy.heading}</p>
        {detail.breakdown.length > 0 && (
          <TransactionDetailRows rows={detail.breakdown} mask={mask} />
        )}
        {detail.breakdown.length > 0 && detail.result.length > 0 && (
          <div className="border-border border-t border-dashed" />
        )}
        {detail.result.length > 0 && (
          <TransactionDetailRows rows={detail.result} mask={mask} strong />
        )}
      </div>
      {detail.comment && (
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs">{copy.comment}</p>
          <p className="text-sm break-words whitespace-pre-wrap">
            {detail.comment}
          </p>
        </div>
      )}
      {detail.tags.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-muted-foreground text-xs">{copy.tags}</p>
          <div className="flex flex-wrap gap-1">
            {detail.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
