import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "general", label: "General" },
  { value: "assistant", label: "Assistant" },
  { value: "cash", label: "Cash" },
  { value: "accounts", label: "Accounts" },
  { value: "data", label: "Data" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const TAB_VALUES = TABS.map((tab) => tab.value) as readonly string[];

export function SettingsTabs({
  defaultTab,
  general,
  assistant,
  cash,
  accounts,
  data,
}: Record<TabValue, React.ReactNode> & { defaultTab?: string }) {
  const content: Record<TabValue, React.ReactNode> = {
    general,
    assistant,
    cash,
    accounts,
    data,
  };
  const initialTab = TAB_VALUES.includes(defaultTab ?? "")
    ? (defaultTab as TabValue)
    : "general";

  return (
    <Tabs defaultValue={initialTab}>
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
