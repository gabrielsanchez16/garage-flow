import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { periodKPIs, type ProfitBreakdown } from "@/lib/accounting";
import { usePeriod } from "@/stores/period";
import { periodLabel } from "@/lib/period";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  TrendingUp,
  Receipt,
  HardHat,
  CupSoda,
  Boxes,
  PackageOpen,
  Wrench,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/")({ component: Dashboard });

const COLORS = ["oklch(0.745 0.175 55)", "oklch(0.7 0.18 145)", "oklch(0.65 0.18 25)", "oklch(0.65 0.18 260)"];

function Dashboard() {
  const { activeKey } = usePeriod();
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const wos = useLiveQuery(
    () => db.workOrders.where("periodKey").equals(activeKey).toArray(),
    [activeKey]
  ) ?? [];
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const [kpi, setKpi] = useState<Awaited<ReturnType<typeof periodKPIs>> | null>(null);

  useEffect(() => {
    periodKPIs(activeKey).then(setKpi);
    // recompute on any data change tied to live queries
  }, [activeKey, wos.length, products.length]);

  const p: ProfitBreakdown = kpi?.profit ?? { bebidas: 0, repuestosTaller: 0, repuestosExternos: 0, manoObra: 0, insumos: 0, mecanico: 0, total: 0 };

  const pieData = [
    { name: "Bebidas", value: p.bebidas, icon: CupSoda },
    { name: "Repuestos taller", value: p.repuestosTaller, icon: Boxes },
    { name: "Repuestos externos", value: p.repuestosExternos, icon: PackageOpen },
    { name: "Mano de obra", value: p.manoObra, icon: Wrench },
  ];
  const totalProfit = pieData.reduce((a, b) => a + b.value, 0);

  const kpis = [
    { label: "Caja esperada", value: money(kpi?.cashExpected ?? 0), sub: "Movimientos del mes", icon: Wallet, tone: "text-primary" },
    { label: "Ganancia total", value: money(totalProfit), sub: `${kpi?.workOrders.closed ?? 0} OS cerradas`, icon: TrendingUp, tone: "text-emerald-400" },
    { label: "Por pagar mecánicos", value: money(kpi?.mechanicOwed ?? 0), sub: `Pagado: ${money(kpi?.mechanicPaid ?? 0)}`, icon: HardHat, tone: "text-amber-400" },
    { label: "Gastos del mes", value: money(kpi?.expenses ?? 0), sub: "Arriendo, servicios, otros", icon: Receipt, tone: "text-destructive" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Dashboard" subtitle={`Resumen de ${periodLabel(activeKey)}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="metallic-border kpi-shine relative overflow-hidden">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{k.label}</div>
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
        <Card className="lg:col-span-2 metallic-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">Ganancias por categoría</div>
              <div className="text-xs text-muted-foreground">Distribución del mes</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-primary">{money(totalProfit)}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "oklch(0.205 0.012 264)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => money(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[i] }} />
                  <d.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm flex-1">{d.name}</div>
                  <div className="text-sm font-semibold">{money(d.value)}</div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground pl-2 pt-1">
                Incluido en mano de obra · insumos: <span className="text-foreground">{money(p.insumos)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="metallic-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4 text-primary" />
            <div className="font-semibold">Órdenes del mes</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Mini label="Total" value={kpi?.workOrders.total ?? 0} />
            <Mini label="Abiertas" value={kpi?.workOrders.open ?? 0} tone="text-amber-400" />
            <Mini label="Cerradas" value={kpi?.workOrders.closed ?? 0} tone="text-emerald-400" />
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Stock bajo</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {lowStock.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Todo en orden ✓</div>
            ) : (
              lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                  <span className="truncate flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-400" /> {p.name}
                  </span>
                  <span className="text-xs text-destructive font-bold">{p.stock}/{p.minStock}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}
