import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  AlertTriangle,
  ShoppingCart,
  Wrench,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const sales = useLiveQuery(() => db.sales.orderBy("date").reverse().toArray(), []) ?? [];
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const cash = useLiveQuery(() => db.cashSessions.where("status").equals("open").first(), []);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = sales.filter((s) => s.date >= startOfDay.getTime());
  const todaysRevenue = today.reduce((a, b) => a + b.total, 0);
  const todaysProfit = today.reduce((a, b) => a + b.profit, 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock);

  // Build last-7-days chart
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const chart = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const total = sales
      .filter((s) => s.date >= d.getTime() && s.date < next.getTime())
      .reduce((a, b) => a + b.total, 0);
    return {
      label: d.toLocaleDateString("es-CO", { weekday: "short" }),
      total,
    };
  });

  const kpis = [
    {
      label: "Ventas hoy",
      value: money(todaysRevenue),
      sub: `${today.length} transacciones`,
      icon: DollarSign,
      tone: "text-primary",
    },
    {
      label: "Utilidad hoy",
      value: money(todaysProfit),
      sub: "Margen bruto",
      icon: TrendingUp,
      tone: "text-emerald-400",
    },
    {
      label: "Caja actual",
      value: cash ? "Abierta" : "Cerrada",
      sub: cash ? `Apertura ${money(cash.openingAmount)}` : "Sin sesión activa",
      icon: Wallet,
      tone: cash ? "text-emerald-400" : "text-muted-foreground",
    },
    {
      label: "Stock bajo",
      value: String(lowStock.length),
      sub: "Productos por reponer",
      icon: AlertTriangle,
      tone: "text-amber-400",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Dashboard" subtitle="Resumen del taller en tiempo real" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="metallic-border kpi-shine relative overflow-hidden">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {k.label}
                  </div>
                  <div className={`h-9 w-9 rounded-xl bg-background/60 grid place-items-center ${k.tone}`}>
                    <k.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-bold mt-3 tracking-tight">{k.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{k.sub}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2 metallic-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Ventas últimos 7 días</CardTitle>
              <p className="text-xs text-muted-foreground">Ingresos diarios</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <ArrowUpRight className="h-3 w-3 text-primary" /> En vivo
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.745 0.175 55)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.745 0.175 55)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "oklch(0.68 0.015 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.68 0.015 260)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.205 0.012 264)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => money(v)}
                  />
                  <Area type="monotone" dataKey="total" stroke="oklch(0.745 0.175 55)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="metallic-border">
          <CardHeader>
            <CardTitle className="text-base">Stock bajo</CardTitle>
            <p className="text-xs text-muted-foreground">{lowStock.length} productos por reponer</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {lowStock.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Todo en orden ✓</p>
            )}
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                </div>
                <Badge variant="destructive" className="shrink-0">
                  {p.stock}/{p.minStock}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card className="metallic-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Últimas ventas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sales.slice(0, 6).length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aún no hay ventas registradas.
              </p>
            )}
            {sales.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border"
              >
                <div>
                  <div className="text-sm font-medium">
                    {s.items.length} ítems · {s.paymentMethod}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(s.date)}</div>
                </div>
                <div className="text-sm font-bold text-primary">{money(s.total)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="metallic-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Atajos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "Nueva venta", to: "/pos", icon: ShoppingCart },
              { label: "Abrir caja", to: "/cash", icon: Wallet },
              { label: "Nueva orden", to: "/work-orders", icon: Wrench },
              { label: "Inventario", to: "/inventory", icon: TrendingUp },
            ].map((q) => (
              <a
                key={q.label}
                href={q.to}
                className="group p-4 rounded-2xl bg-muted/30 border border-border hover:border-primary/50 hover:bg-primary/10 transition-all"
              >
                <q.icon className="h-5 w-5 text-primary mb-3" />
                <div className="text-sm font-medium">{q.label}</div>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
