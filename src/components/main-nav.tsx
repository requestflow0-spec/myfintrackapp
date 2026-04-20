"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PiggyBank,
  Landmark,
  ArrowRightLeft,
  User,
  Settings,
} from "lucide-react";

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  const routes = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/dashboard" },
    { href: "/income", label: "Income", icon: TrendingUp, active: pathname === "/income" },
    { href: "/expenses", label: "Expenses", icon: TrendingDown, active: pathname === "/expenses" },
    { href: "/transactions", label: "Transactions", icon: ArrowRightLeft, active: pathname === "/transactions" },
    { href: "/budgets", label: "Budgets", icon: PiggyBank, active: pathname === "/budgets" || pathname === "/budgets/add" },
    { href: "/recurring", label: "Recurring", icon: ArrowRightLeft, active: pathname === "/recurring" || pathname === "/recurring/add" },
    { href: "/savings", label: "Savings", icon: PiggyBank, active: pathname === "/savings" },
    { href: "/debts", label: "Debts", icon: Landmark, active: pathname === "/debts" },
    { href: "/reports", label: "Reports", icon: BarChart3, active: pathname === "/reports" },
    { href: "/settings", label: "Settings", icon: Settings, active: pathname === "/settings" },
  ];

  return (
    <nav className={cn("flex flex-col space-y-1 p-4", className)} {...props}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
            route.active 
              ? "bg-primary/10 text-primary font-semibold" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <route.icon className={cn("h-4.5 w-4.5", route.active ? "text-primary" : "text-muted-foreground/70")} />
          <span className="font-headline tracking-tight">{route.label}</span>
        </Link>
      ))}
    </nav>
  );
}
