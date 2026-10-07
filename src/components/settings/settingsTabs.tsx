import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "general", label: "General" },
  { value: "accounts", label: "Accounts" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const TAB_ALIASES: Record<string, TabValue> = {
  general: "general",
  assistant: "general",
  accounts: "accounts",
  cash: "accounts",
  data: "accounts",
};

export function SettingsTabs({
  defaultTab,
  general,
  accounts,
}: Record<TabValue, React.ReactNode> & { defaultTab?: string }) {
  const content: Record<TabValue, React.ReactNode> = { general, accounts };
  const initialTab = TAB_ALIASES[defaultTab ?? ""] ?? "general";

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
