import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Wallet,
  Users,
  Wrench,
  ClipboardList,
  PackagePlus,
  BarChart3,
  Database,
  Settings as SettingsIcon,
  Menu,
  CalendarRange,
  Receipt,
  HardHat,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db, seedIfEmpty, ensureCurrentPeriod } from "@/lib/db";
import { usePeriod } from "@/stores/period";
import { periodLabel } from "@/lib/period";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "POS", icon: ShoppingCart },
  { to: "/work-orders", label: "Órdenes", icon: ClipboardList },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/services", label: "Servicios", icon: Wrench },
  { to: "/customers", label: "Clientes", icon: Users },
  { to: "/mechanics", label: "Mecánicos", icon: HardHat },
  { to: "/expenses", label: "Gastos", icon: Receipt },
  { to: "/cash", label: "Caja", icon: Wallet },
  { to: "/purchases", label: "Compras", icon: PackagePlus },
  { to: "/reports", label: "Reportes", icon: BarChart3 },
  { to: "/periods", label: "Períodos", icon: CalendarRange },
  { to: "/backups", label: "Backups", icon: Database },
];

const mobileNav = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/work-orders", label: "Órdenes", icon: ClipboardList },
  { to: "/pos", label: "POS", icon: ShoppingCart },
  { to: "/cash", label: "Caja", icon: Wallet },
  { to: "/expenses", label: "Más", icon: Menu },
];

export function AppLayout() {
  const [open, setOpen] = useState(true);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    seedIfEmpty();
    ensureCurrentPeriod();
  }, []);

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all",
          open ? "w-60" : "w-20"
        )}
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <Logo />
          {open && (
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">FullStack</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Garage
              </div>
            </div>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const active = path === n.to || (n.to !== "/" && path.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary"
                  />
                )}
                <n.icon className="h-5 w-5 shrink-0" />
                {open && <span className="font-medium">{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent"
          >
            <SettingsIcon className="h-5 w-5" />
            {open && <span>Ajustes</span>}
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-xl sticky top-0 z-30">
          <div className="h-full px-4 lg:px-6 flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <Logo />
              <div className="leading-tight">
                <div className="text-sm font-bold">FullStack</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest">
                  Garage
                </div>
              </div>
            </div>
            <PeriodSelector />
            <div className="ml-auto flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 grid place-items-center text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
                FG
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {mobileNav.map((n) => {
            const active = path === n.to || (n.to !== "/" && path.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <n.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_oklch(0.745_0.175_55/0.6)]")} />
                <span className="font-medium">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster theme="dark" position="top-right" />
    </div>
  );
}

function PeriodSelector() {
  const { activeKey, setActive } = usePeriod();
  const periods = useLiveQuery(() => db.periods.toArray(), []) ?? [];
  const sorted = [...periods].sort((a, b) => (a.key < b.key ? 1 : -1));

  return (
    <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/40 border border-border min-w-0">
      <CalendarRange className="h-4 w-4 text-primary shrink-0" />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
        Período
      </span>
      <Select value={activeKey} onValueChange={setActive}>
        <SelectTrigger className="h-8 border-0 bg-transparent px-1 text-sm font-semibold focus:ring-0">
          <SelectValue placeholder={periodLabel(activeKey)} />
        </SelectTrigger>
        <SelectContent>
          {sorted.length === 0 && (
            <SelectItem value={activeKey}>{periodLabel(activeKey)}</SelectItem>
          )}
          {sorted.map((p) => (
            <SelectItem key={p.key} value={p.key}>
              {p.label} {p.status === "closed" ? "· cerrado" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Logo() {
  return (
    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-amber-500 to-orange-700 grid place-items-center shadow-lg shadow-primary/30">
      <Wrench className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
    </div>
  );
}
