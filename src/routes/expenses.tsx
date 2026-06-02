import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Expense, type PaymentMethod } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { usePeriod } from "@/stores/period";
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
import { Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/expenses")({ component: Expenses });

const CATS: { id: Expense["category"]; label: string; tone: string }[] = [
  { id: "arriendo", label: "Arriendo", tone: "bg-blue-500/15 text-blue-400" },
  { id: "servicios", label: "Servicios", tone: "bg-purple-500/15 text-purple-400" },
  { id: "compras", label: "Compras", tone: "bg-amber-500/15 text-amber-400" },
  { id: "nomina", label: "Nómina", tone: "bg-emerald-500/15 text-emerald-400" },
  { id: "otro", label: "Otro", tone: "bg-muted text-muted-foreground" },
];

function Expenses() {
  const { activeKey } = usePeriod();
  const [open, setOpen] = useState(false);
  const expenses = useLiveQuery(
    () => db.expenses.where("periodKey").equals(activeKey).reverse().sortBy("date"),
    [activeKey]
  ) ?? [];

  const total = expenses.reduce((a, b) => a + b.amount, 0);
  const byCat = CATS.map((c) => ({ ...c, sum: expenses.filter((e) => e.category === c.id).reduce((a, b) => a + b.amount, 0) }));

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Gastos"
        subtitle="Gastos operativos del período"
        action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Nuevo gasto</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <Card className="metallic-border p-4 col-span-2 lg:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total del mes</div>
          <div className="text-3xl font-bold mt-1 text-destructive">{money(total)}</div>
        </Card>
        {byCat.map((c) => (
          <Card key={c.id} className="metallic-border p-4">
            <Badge className={`${c.tone} border-0 text-[10px]`}>{c.label}</Badge>
            <div className="text-lg font-bold mt-2">{money(c.sum)}</div>
          </Card>
        ))}
      </div>

      <Card className="metallic-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => {
                const cat = CATS.find((c) => c.id === e.category)!;
                return (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3"><Badge className={`${cat.tone} border-0`}>{cat.label}</Badge></td>
                    <td className="px-4 py-3 font-medium">{e.concept}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{e.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-bold text-destructive">-{money(e.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={async () => {
                        if (!confirm("¿Eliminar gasto?")) return;
                        await db.expenses.delete(e.id!);
                        // remove cash movement
                        const linked = await db.cashMovements.where("type").equals("expense").and((m) => m.refId === e.id).toArray();
                        for (const m of linked) await db.cashMovements.delete(m.id!);
                        toast.success("Eliminado");
                      }} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Sin gastos registrados este mes.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ExpenseDialog open={open} onOpenChange={setOpen} periodKey={activeKey} />
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, periodKey }: { open: boolean; onOpenChange: (b: boolean) => void; periodKey: string }) {
  const [category, setCategory] = useState<Expense["category"]>("otro");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Expense["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Concepto</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Arriendo local marzo" /></div>
          <div><Label>Monto</Label><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="h-12 text-lg" /></div>
          <div>
            <Label>Método de pago</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="mixed">Mixto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!concept || amount <= 0) return toast.error("Concepto y monto requeridos");
            const id = await db.expenses.add({
              date: Date.now(),
              periodKey,
              category,
              concept,
              amount,
              paymentMethod: method,
            });
            if (method === "cash" || method === "mixed") {
              await db.cashMovements.add({
                date: Date.now(),
                periodKey,
                type: "expense",
                amount,
                refId: id as number,
                description: `Gasto · ${concept}`,
                paymentMethod: method,
              });
            }
            toast.success("Gasto registrado");
            setConcept(""); setAmount(0); setCategory("otro"); setMethod("cash");
            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
