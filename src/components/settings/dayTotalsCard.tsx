"use client";

import { useDayTotalsInAccount } from "@/hooks/useDayTotalsInAccount";

import { SettingToggleCard } from "@/components/ui/settingToggleCard";

export function DayTotalsCard() {
  const { dayTotalsInAccount, setDayTotalsInAccount } = useDayTotalsInAccount();

  return (
    <SettingToggleCard
      title="Day totals in account currency"
      description="On a single-currency account tab, show each day's total in that currency instead of your base currency."
      checked={dayTotalsInAccount}
      onCheckedChange={setDayTotalsInAccount}
    />
  );
}
