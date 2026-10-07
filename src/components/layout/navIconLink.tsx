"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import type { NavItem } from "./navItems";

export function NavIconLink({
  item,
  className,
}: {
  item: NavItem;
  className?: string;
}) {
  const active = isActivePath(usePathname(), item.href);

  return (
    <Button
      asChild
      variant="ghost"
      size="icon-sm"
      aria-label={item.label}
      className={cn(active && "text-foreground", className)}
    >
      <Link href={item.href} aria-current={active ? "page" : undefined}>
        <item.icon />
      </Link>
    </Button>
  );
}
