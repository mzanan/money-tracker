import { ChartPieIcon, HomeIcon, SettingsIcon } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/dashboard", label: "Dashboard", icon: ChartPieIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;
