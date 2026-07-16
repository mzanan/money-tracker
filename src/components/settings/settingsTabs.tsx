"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const TABS = [
  { value: "general", label: "General" },
  { value: "cash", label: "Cash" },
  { value: "accounts", label: "Accounts" },
  { value: "data", label: "Data" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function SettingsTabs({
  general,
  cash,
  accounts,
  data,
}: Record<TabValue, React.ReactNode>) {
  const content: Record<TabValue, React.ReactNode> = {
    general,
    cash,
    accounts,
    data,
  };

  return (
    <Tabs defaultValue="general">
      <TabsList className="w-full">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="grid gap-6 pt-4"
        >
          {content[tab.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
