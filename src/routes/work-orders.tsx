import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type WorkOrder } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/work-orders")({ component: WorkOrders });

const STATUS = {
  pending: { label: "Pendiente", tone: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  in_progress: { label: "En proceso", tone: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  done: { label: "Lista", tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  delivered: { label: "Entregada", tone: "bg-muted text-muted-foreground border-border" },
} as const;

function WorkOrders() {
  const [open, setOpen] = useState(false);
  const orders = useLiveQuery(() => db.workOrders.orderBy("date").reverse().toArray(), []) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Órdenes de servicio"
        subtitle={`${orders.length} órdenes registradas`}
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva orden
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-3">
        {orders.map((o) => (
          <Card key={o.id} className="metallic-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  OS #{o.id} · {fmtDate(o.date)}
                </div>
                <div className="font-semibold mt-1">{o.customerName}</div>
                <div className="text-sm text-muted-foreground">
                  {o.motorcycle} · <span className="font-mono">{o.plate}</span> · {o.km.toLocaleString()} km
                </div>
              </div>
              <Badge className={`${STATUS[o.status].tone} border`}>{STATUS[o.status].label}</Badge>
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-xs uppercase text-muted-foreground tracking-wider">Diagnóstico</div>
              <div className="text-sm">{o.diagnosis}</div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider mt-2">Trabajos</div>
              <div className="text-sm">{o.work}</div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <Select
                value={o.status}
                onValueChange={async (v) => {
                  await db.workOrders.update(o.id!, { status: v as any });
                  toast.success("Estado actualizado");
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-lg font-bold text-primary">{money(o.total)}</div>
            </div>
          </Card>
        ))}
        {orders.length === 0 && (
          <Card className="metallic-border lg:col-span-2 p-10 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <div className="text-sm text-muted-foreground">Aún no hay órdenes de servicio.</div>
          </Card>
        )}
      </div>

      <OrderDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function OrderDialog({ open, onOpenChange }: any) {
  const [form, setForm] = useState<Partial<WorkOrder>>({});
  const data = {
    customerName: "",
    motorcycle: "",
    plate: "",
    km: 0,
    diagnosis: "",
    work: "",
    notes: "",
    total: 0,
    ...form,
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) setForm({}); onOpenChange(b); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva orden de servicio</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="col-span-2"><Label>Cliente</Label><Input value={data.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} /></div>
          <div><Label>Moto</Label><Input value={data.motorcycle} onChange={(e) => setForm((f) => ({ ...f, motorcycle: e.target.value }))} /></div>
          <div><Label>Placa</Label><Input value={data.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))} /></div>
          <div><Label>Kilometraje</Label><Input type="number" value={data.km} onChange={(e) => setForm((f) => ({ ...f, km: Number(e.target.value) }))} /></div>
          <div><Label>Total</Label><Input type="number" value={data.total} onChange={(e) => setForm((f) => ({ ...f, total: Number(e.target.value) }))} /></div>
          <div className="col-span-2"><Label>Diagnóstico</Label><Textarea rows={2} value={data.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Trabajos a realizar</Label><Textarea rows={2} value={data.work} onChange={(e) => setForm((f) => ({ ...f, work: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Observaciones</Label><Textarea rows={2} value={data.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!data.customerName || !data.plate) return toast.error("Cliente y placa requeridos");
            await db.workOrders.add({
              date: Date.now(),
              status: "pending",
              parts: [],
              ...(data as WorkOrder),
            });
            toast.success("Orden creada");
            setForm({});
            onOpenChange(false);
          }}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
