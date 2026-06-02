import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { periodLabel, nextPeriodKey } from "@/lib/period";
import { usePeriod } from "@/stores/period";
import { periodKPIs } from "@/lib/accounting";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Lock, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/periods")({ component: Periods });

function Periods() {
  const { activeKey, setActive } = usePeriod();
  const periods = useLiveQuery(() => db.periods.toArray(), []) ?? [];
  const sorted = [...periods].sort((a, b) => (a.key < b.key ? 1 : -1));
  const current = sorted[0];

  async function closeAndOpenNext() {
    if (!current) return;
    if (!confirm(`¿Cerrar ${current.label} y abrir ${periodLabel(nextPeriodKey(current.key))}?`)) return;
    const kpi = await periodKPIs(current.key);
    const snapshot = {
      revenue: kpi.revenue,
      profit: kpi.profit.total,
      expenses: kpi.expenses,
      mechanicOwed: kpi.mechanicOwed,
      mechanicPaid: kpi.mechanicPaid,
      cashExpected: kpi.cashExpected,
      workOrdersClosed: kpi.workOrders.closed,
    };
    await db.periods.update(current.key, { status: "closed", closedAt: Date.now(), snapshot });
    const nk = nextPeriodKey(current.key);
    await db.periods.put({ key: nk, label: periodLabel(nk), status: "open", openedAt: Date.now() });
    setActive(nk);
    toast.success(`Mes cerrado y nuevo período abierto`);
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <PageHeader
        title="Períodos contables"
        subtitle="Un ciclo por mes · los datos no se borran, solo se cierra el corte"
        action={
          current?.status === "open" ? (
            <Button onClick={closeAndOpenNext} className="gap-2">
              <Lock className="h-4 w-4" /> Cerrar {current.label}
            </Button>
          ) : null
        }
      />

      <div className="space-y-3">
        {sorted.map((p) => (
          <Card key={p.key} className={`metallic-border p-4 ${p.key === activeKey ? "ring-1 ring-primary/40" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-11 w-11 rounded-xl grid place-items-center ${p.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.key}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.status === "open" ? "default" : "secondary"}>{p.status === "open" ? "Abierto" : "Cerrado"}</Badge>
                <Button size="sm" variant="outline" onClick={() => setActive(p.key)} className="gap-1">
                  Ver <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {p.snapshot && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-center">
                <Mini label="Ingresos" v={money(p.snapshot.revenue)} />
                <Mini label="Ganancia" v={money(p.snapshot.profit)} tone="text-emerald-400" />
                <Mini label="Gastos" v={money(p.snapshot.expenses)} tone="text-destructive" />
                <Mini label="OS cerradas" v={String(p.snapshot.workOrdersClosed)} />
              </div>
            )}
          </Card>
        ))}
        {sorted.length === 0 && (
          <Card className="metallic-border p-10 text-center text-sm text-muted-foreground">
            Sin períodos aún.
          </Card>
        )}
      </div>
    </div>
  );
}

function Mini({ label, v, tone = "" }: { label: string; v: string; tone?: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${tone}`}>{v}</div>
    </div>
  );
}
