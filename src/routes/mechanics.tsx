import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Mechanic } from "@/lib/db";
import { money } from "@/lib/format";
import { usePeriod } from "@/stores/period";
import { mechanicEarnings } from "@/lib/accounting";
import { ensureCurrentPeriod } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, HardHat, Pencil, Trash2, Banknote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mechanics")({ component: Mechanics });

function Mechanics() {
  const { activeKey } = usePeriod();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [payDlg, setPayDlg] = useState<Mechanic | null>(null);

  const mechanics = useLiveQuery(() => db.mechanics.toArray(), []) ?? [];
  const payouts = useLiveQuery(() => db.mechanicPayouts.where("periodKey").equals(activeKey).toArray(), [activeKey]) ?? [];
  const wos = useLiveQuery(() => db.workOrders.where("periodKey").equals(activeKey).toArray(), [activeKey]) ?? [];

  const [rows, setRows] = useState<Awaited<ReturnType<typeof mechanicEarnings>>>([]);
  useState(() => {
    mechanicEarnings(activeKey).then(setRows);
  });
  // recompute when deps change
  useStateEffect(activeKey, payouts.length, wos.length, mechanics.length, () => {
    mechanicEarnings(activeKey).then(setRows);
  });

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Mecánicos"
        subtitle="Pagos por mano de obra del período activo"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo mecánico
          </Button>
        }
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((r) => (
          <Card key={r.mechanic.id} className="metallic-border p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center text-primary">
                  <HardHat className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{r.mechanic.name}</div>
                  <div className="text-xs text-muted-foreground">{r.mechanic.phone ?? "—"}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(r.mechanic); setOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={async () => { if (confirm(`¿Eliminar ${r.mechanic.name}?`)) { await db.mechanics.delete(r.mechanic.id!); toast.success("Eliminado"); } }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Box label="Devengado" v={money(r.earned)} />
              <Box label="Pagado" v={money(r.paid)} tone="text-emerald-400" />
              <Box label="Pendiente" v={money(r.pending)} tone={r.pending > 0 ? "text-amber-400" : ""} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <Badge variant="secondary" className="text-[10px]">{r.jobs} trabajos</Badge>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setPayDlg(r.mechanic)} disabled={r.pending <= 0}>
                <Banknote className="h-3.5 w-3.5" /> Pagar
              </Button>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="metallic-border col-span-full p-10 text-center text-sm text-muted-foreground">
            Aún no hay mecánicos.
          </Card>
        )}
      </div>

      <MechDialog open={open} onOpenChange={setOpen} editing={editing} />
      <PayDialog open={!!payDlg} onOpenChange={(b) => !b && setPayDlg(null)} mechanic={payDlg} periodKey={activeKey} pending={rows.find((r) => r.mechanic.id === payDlg?.id)?.pending ?? 0} />
    </div>
  );
}

function useStateEffect(...deps: unknown[]) {
  const fn = deps[deps.length - 1] as () => void;
  const arr = deps.slice(0, -1);
  // tiny custom effect using react hook
  const React = require("react") as typeof import("react");
  React.useEffect(() => { fn(); }, arr); // eslint-disable-line react-hooks/exhaustive-deps
}

function Box({ label, v, tone = "" }: { label: string; v: string; tone?: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${tone}`}>{v}</div>
    </div>
  );
}

function MechDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (b: boolean) => void; editing: Mechanic | null }) {
  const [form, setForm] = useState<Partial<Mechanic>>({});
  const data: Mechanic = { name: "", phone: "", active: true, createdAt: Date.now(), ...(editing ?? {}), ...form };
  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) setForm({}); onOpenChange(b); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar mecánico" : "Nuevo mecánico"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={data.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Teléfono</Label><Input value={data.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div className="flex items-center gap-2"><Switch checked={data.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} /> <Label>Activo</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!data.name) return toast.error("Nombre requerido");
            if (editing) await db.mechanics.update(editing.id!, data);
            else await db.mechanics.add(data);
            toast.success("Guardado");
            setForm({});
            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ open, onOpenChange, mechanic, periodKey, pending }: { open: boolean; onOpenChange: (b: boolean) => void; mechanic: Mechanic | null; periodKey: string; pending: number }) {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar a {mechanic?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pendiente</span>
            <span className="font-bold text-amber-400">{money(pending)}</span>
          </div>
          <div><Label>Monto a pagar</Label><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="h-12 text-lg" /></div>
          <Button variant="outline" size="sm" onClick={() => setAmount(pending)}>Usar pendiente completo</Button>
          <div><Label>Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!mechanic || amount <= 0) return;
            await ensureCurrentPeriod();
            const id = await db.mechanicPayouts.add({
              mechanicId: mechanic.id!,
              periodKey,
              amount,
              paidAt: Date.now(),
              note,
            });
            await db.cashMovements.add({
              date: Date.now(),
              periodKey,
              type: "mechanic_payout",
              amount,
              refId: id as number,
              description: `Pago a ${mechanic.name}${note ? ` · ${note}` : ""}`,
              paymentMethod: "cash",
            });
            toast.success("Pago registrado");
            setAmount(0); setNote("");
            onOpenChange(false);
          }}>Registrar pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
