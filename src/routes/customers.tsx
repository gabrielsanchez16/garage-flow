import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Customer } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Phone, Bike, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({ component: Customers });

function Customers() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} clientes registrados`}
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {customers.map((c) => (
          <Card key={c.id} className="metallic-border p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="font-semibold">{c.name}</div>
                {c.phone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </div>
                )}
                {c.motorcycle && (
                  <div className="text-sm flex items-center gap-1 mt-2">
                    <Bike className="h-3.5 w-3.5 text-primary" /> {c.motorcycle}
                  </div>
                )}
                {c.plate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Placa <span className="text-foreground font-mono">{c.plate}</span> · {c.km?.toLocaleString() ?? 0} km
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditing(c); setOpen(true); }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm("¿Eliminar?")) {
                      await db.customers.delete(c.id!);
                      toast.success("Cliente eliminado");
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
        {customers.length === 0 && (
          <Card className="metallic-border col-span-full p-10 text-center text-sm text-muted-foreground">
            No hay clientes aún.
          </Card>
        )}
      </div>

      <CustomerDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function CustomerDialog({ open, onOpenChange, editing }: any) {
  const [form, setForm] = useState<Partial<Customer>>({});
  const data = { ...(editing ?? { name: "", phone: "", motorcycle: "", plate: "", km: 0 }), ...form };
  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) setForm({}); onOpenChange(b); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={data.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Teléfono</Label><Input value={data.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Moto</Label><Input value={data.motorcycle ?? ""} onChange={(e) => setForm((f) => ({ ...f, motorcycle: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Placa</Label><Input value={data.plate ?? ""} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))} /></div>
            <div><Label>Kilometraje</Label><Input type="number" value={data.km ?? 0} onChange={(e) => setForm((f) => ({ ...f, km: Number(e.target.value) }))} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!data.name) return toast.error("Nombre requerido");
            if (editing) await db.customers.update(editing.id!, data);
            else await db.customers.add({ ...(data as Customer), createdAt: Date.now() });
            toast.success("Guardado");
            setForm({});
            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
