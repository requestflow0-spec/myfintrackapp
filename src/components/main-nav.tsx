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
    { href: "/savings", label: "Savings", icon: PiggyBank, active: pathname === "/savings" },
    { href: "/debts", label: "Debts", icon: Landmark, active: pathname === "/debts" },
    { href: "/reports", label: "Reports", icon: BarChart3, active: pathname === "/reports" },
    { href: "/profile", label: "Profile", icon: User, active: pathname === "/profile" },
    { href: "/settings", label: "Settings", icon: Settings, active: pathname === "/settings" },
  ];

  return (
    <nav className={cn("flex flex-col space-y-2 p-2", className)} {...props}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            route.active && "bg-accent text-primary"
          )}
        >
          <route.icon className="h-4 w-4" />
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
