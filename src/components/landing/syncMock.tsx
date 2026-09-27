import { CheckIcon, Loader2Icon } from "lucide-react";

import { Avatar } from "@/components/transactions/avatar";
import { ListRow } from "@/components/ui/listRow";

import landingCopy from "./landing.json";

const mock = landingCopy.mocks.sync;

export function SyncMock() {
  return (
    <div
      aria-hidden
      className="flex size-full flex-col justify-between gap-6 p-6 select-none"
    >
      <div className="bg-card flex flex-col rounded-2xl px-4 py-4">
        {mock.accounts.map((account, index) => (
          <ListRow
            key={account.name}
            leading={<Avatar seed={account.name} />}
            title={account.name}
            meta={account.meta}
          >
            <span
              style={{ animationDelay: `${index * 400}ms` }}
              className="relative grid size-6 place-items-center *:col-start-1 *:row-start-1 *:[animation-delay:inherit]"
            >
              <span className="animate-sync-pending motion-reduce:hidden">
                <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
              </span>
              <span className="bg-income text-income animate-sync-done grid size-6 place-items-center rounded-full motion-reduce:animate-none">
                <CheckIcon className="size-3.5" />
              </span>
            </span>
          </ListRow>
        ))}
      </div>
      <p className="text-center">
        <span className="text-primary font-heading text-4xl font-semibold tabular-nums">
          +{mock.result}
        </span>
        <span className="text-muted-foreground block text-sm">
          {mock.resultLabel}
        </span>
      </p>
    </div>
  );
}
