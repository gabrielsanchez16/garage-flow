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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Wrench, Pencil, Trash2, Clock } from "lucide-react";
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
        subtitle="Catálogo de servicios del taller"
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
            <div className="font-semibold mt-3">{s.name}</div>
            {s.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</div>}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {s.estimatedMinutes} min</span>
              <span className="font-bold text-primary">{money(s.price)}</span>
            </div>
          </Card>
        ))}
      </div>

      <ServiceDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ServiceDialog({ open, onOpenChange, editing }: any) {
  const [form, setForm] = useState<Partial<Service>>({});
  const data = { ...(editing ?? { name: "", price: 0, cost: 0, estimatedMinutes: 30, description: "" }), ...form };
  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) setForm({}); onOpenChange(b); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={data.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Precio</Label><Input type="number" value={data.price ?? 0} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} /></div>
            <div><Label>Costo</Label><Input type="number" value={data.cost ?? 0} onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) }))} /></div>
            <div><Label>Min.</Label><Input type="number" value={data.estimatedMinutes ?? 0} onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: Number(e.target.value) }))} /></div>
          </div>
          <div><Label>Descripción</Label><Textarea value={data.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!data.name) return toast.error("Nombre requerido");
            if (editing) await db.services.update(editing.id!, data);
            else await db.services.add(data as Service);
            toast.success("Guardado");
            setForm({});
            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
