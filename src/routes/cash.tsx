import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type CashMovement } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { usePeriod } from "@/stores/period";
import { periodLabel } from "@/lib/period";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, ArrowDown, ArrowUp, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cash")({ component: Cash });

const IN_TYPES: CashMovement["type"][] = ["wo_payment", "pos_sale", "adjust_in"];

const TYPE_LABELS: Record<CashMovement["type"], { label: string; tone: string; in: boolean }> = {
  wo_payment: { label: "Cobro OS", tone: "text-emerald-400", in: true },
  pos_sale: { label: "Venta POS", tone: "text-emerald-400", in: true },
  external_part_purchase: { label: "Compra externa", tone: "text-destructive", in: false },
  expense: { label: "Gasto", tone: "text-destructive", in: false },
  mechanic_payout: { label: "Pago mecánico", tone: "text-destructive", in: false },
  adjust_in: { label: "Ajuste +", tone: "text-emerald-400", in: true },
  adjust_out: { label: "Ajuste −", tone: "text-destructive", in: false },
};

function Cash() {
  const { activeKey } = usePeriod();
  const [adjust, setAdjust] = useState(false);
  const movements = useLiveQuery(
    () => db.cashMovements.where("periodKey").equals(activeKey).reverse().sortBy("date"),
    [activeKey]
  ) ?? [];

  const incoming = movements.filter((m) => IN_TYPES.includes(m.type)).reduce((a, b) => a + b.amount, 0);
  const outgoing = movements.filter((m) => !IN_TYPES.includes(m.type)).reduce((a, b) => a + b.amount, 0);
  const balance = incoming - outgoing;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Caja"
        subtitle={`Movimientos de efectivo · ${periodLabel(activeKey)}`}
        action={
          <Button onClick={() => setAdjust(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Ajuste manual
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Ingresos" value={money(incoming)} icon={ArrowUp} tone="text-emerald-400" />
        <Stat label="Egresos" value={money(outgoing)} icon={ArrowDown} tone="text-destructive" />
        <Stat label="Saldo esperado" value={money(balance)} icon={Wallet} tone="text-primary" />
        <Stat label="Movimientos" value={String(movements.length)} icon={TrendingUp} tone="text-muted-foreground" />
      </div>

      <Card className="metallic-border overflow-hidden">
        <div className="p-4 border-b border-border font-semibold">Movimientos</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const meta = TYPE_LABELS[m.type];
                return (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(m.date)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{meta.label}</Badge></td>
                    <td className="px-4 py-3">{m.description}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{m.paymentMethod ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${meta.tone}`}>
                      {meta.in ? "+" : "−"}{money(m.amount)}
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Sin movimientos en este período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AdjustDialog open={adjust} onOpenChange={setAdjust} periodKey={activeKey} />
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Wallet; tone: string }) {
  return (
    <Card className="metallic-border kpi-shine p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className={`text-2xl font-bold mt-2 ${tone}`}>{value}</div>
    </Card>
  );
}

function AdjustDialog({ open, onOpenChange, periodKey }: { open: boolean; onOpenChange: (b: boolean) => void; periodKey: string }) {
  const [type, setType] = useState<"adjust_in" | "adjust_out">("adjust_in");
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ajuste manual de caja</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as "adjust_in" | "adjust_out")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adjust_in">Ingreso (+)</SelectItem>
                <SelectItem value="adjust_out">Egreso (−)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Monto</Label><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div><Label>Descripción</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (amount <= 0) return toast.error("Monto inválido");
            await db.cashMovements.add({
              date: Date.now(),
              periodKey,
              type,
              amount,
              description: desc || (type === "adjust_in" ? "Ajuste +" : "Ajuste −"),
              paymentMethod: "cash",
            });
            toast.success("Ajuste registrado");
            setAmount(0); setDesc("");
            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
