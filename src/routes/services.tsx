import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Service } from "@/lib/db";
import { money } from "@/lib/format";
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
import { Plus, Wrench, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/services")({ component: Services });

function Services() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const services = useLiveQuery(() => db.services.toArray(), []) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Servicios"
        subtitle="Mano de obra · precio = insumos + mecánico + ganancia"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo servicio
          </Button>
        }
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {services.map((s) => (
          <Card key={s.id} className="metallic-border p-4 group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => { setEditing(s); setOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={async () => { if (confirm("¿Eliminar?")) { await db.services.delete(s.id!); toast.success("Eliminado"); } }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <Badge variant="secondary" className="mt-3 text-[10px]">{s.category}</Badge>
            <div className="font-semibold mt-2">{s.name}</div>
            <div className="text-2xl font-bold text-primary mt-2">{money(s.price)}</div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
              <Bit label="Insumos" v={s.insumosCost} tone="text-amber-400" />
              <Bit label="Mecánico" v={s.mechanicPay} tone="text-blue-400" />
              <Bit label="Taller" v={s.shopProfit} tone="text-emerald-400" />
            </div>
          </Card>
        ))}
        {services.length === 0 && (
          <Card className="metallic-border col-span-full p-10 text-center text-sm text-muted-foreground">
            Aún no hay servicios.
          </Card>
        )}
      </div>

      <ServiceDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function Bit({ label, v, tone }: { label: string; v: number; tone: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30 text-center">
      <div className="uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-semibold mt-0.5 ${tone}`}>{money(v)}</div>
    </div>
  );
}

function ServiceDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (b: boolean) => void; editing: Service | null }) {
  const [form, setForm] = useState<Partial<Service>>({});
  const data: Service = {
    name: "",
    category: "Mantenimiento",
    price: 0,
    insumosCost: 0,
    mechanicPay: 0,
    shopProfit: 0,
    estimatedMinutes: 30,
    description: "",
    ...(editing ?? {}),
    ...form,
  } as Service;

  const sum = (data.insumosCost ?? 0) + (data.mechanicPay ?? 0) + (data.shopProfit ?? 0);
  const matches = sum === data.price;

  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) setForm({}); onOpenChange(b); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={data.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoría</Label><Input value={data.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></div>
            <div><Label>Tiempo (min)</Label><Input type="number" value={data.estimatedMinutes} onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: Number(e.target.value) }))} /></div>
          </div>
          <div><Label>Precio total al cliente</Label><Input type="number" value={data.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="h-11 text-lg font-semibold" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-amber-400">Insumos</Label><Input type="number" value={data.insumosCost} onChange={(e) => setForm((f) => ({ ...f, insumosCost: Number(e.target.value) }))} /></div>
            <div><Label className="text-blue-400">Mecánico</Label><Input type="number" value={data.mechanicPay} onChange={(e) => setForm((f) => ({ ...f, mechanicPay: Number(e.target.value) }))} /></div>
            <div><Label className="text-emerald-400">Taller</Label><Input type="number" value={data.shopProfit} onChange={(e) => setForm((f) => ({ ...f, shopProfit: Number(e.target.value) }))} /></div>
          </div>
          <div className={`text-xs px-3 py-2 rounded-lg ${matches ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
            Suma de partes: {money(sum)} {matches ? "✓ coincide con el precio" : `· diferencia ${money(data.price - sum)}`}
          </div>
          <div><Label>Descripción</Label><Textarea rows={2} value={data.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!data.name) return toast.error("Nombre requerido");
            if (editing) await db.services.update(editing.id!, data);
            else await db.services.add(data);
            toast.success("Guardado");
            setForm({});
            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
