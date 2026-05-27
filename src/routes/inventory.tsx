import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Product } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({ component: Inventory });

function Inventory() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.sku.toLowerCase().includes(q.toLowerCase()) ||
      p.category.toLowerCase().includes(q.toLowerCase())
  );

  const totalValue = products.reduce((a, p) => a + p.stock * p.cost, 0);
  const lowCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inventario"
        subtitle={`${products.length} productos · Valor: ${money(totalValue)}`}
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="metallic-border p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Productos</div>
          <div className="text-2xl font-bold mt-1">{products.length}</div>
        </Card>
        <Card className="metallic-border p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Valor inventario</div>
          <div className="text-2xl font-bold mt-1 text-primary">{money(totalValue)}</div>
        </Card>
        <Card className="metallic-border p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-400" /> Stock bajo
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-400">{lowCount}</div>
        </Card>
      </div>

      <div className="flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar productos…"
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>

      <Card className="metallic-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Margen</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const margin = p.price - p.cost;
                const pct = p.price ? (margin / p.price) * 100 : 0;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{p.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={p.stock <= p.minStock ? "destructive" : "outline"}>
                        {p.stock}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{money(p.cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(p.price)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{pct.toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`¿Eliminar "${p.name}"?`)) {
                              await db.products.delete(p.id!);
                              toast.success("Producto eliminado");
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ProductDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  editing: Product | null;
}) {
  const [form, setForm] = useState<Partial<Product>>({});
  const init = editing ?? {
    name: "",
    sku: "",
    category: "",
    stock: 0,
    minStock: 1,
    cost: 0,
    price: 0,
    supplier: "",
  };
  const data = { ...init, ...form };

  async function save() {
    if (!data.name || !data.sku) return toast.error("Nombre y SKU requeridos");
    if (editing) {
      await db.products.update(editing.id!, data as Product);
      toast.success("Producto actualizado");
    } else {
      await db.products.add({ ...(data as Product), createdAt: Date.now() });
      toast.success("Producto creado");
    }
    setForm({});
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(b) => {
        if (!b) setForm({});
        onOpenChange(b);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nombre</Label>
            <Input
              value={data.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label>SKU</Label>
            <Input
              value={data.sku ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </div>
          <div>
            <Label>Categoría</Label>
            <Input
              value={data.category ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              value={data.stock ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Stock mínimo</Label>
            <Input
              type="number"
              value={data.minStock ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Costo</Label>
            <Input
              type="number"
              value={data.cost ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Precio venta</Label>
            <Input
              type="number"
              value={data.price ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            />
          </div>
          <div className="col-span-2">
            <Label>Proveedor</Label>
            <Input
              value={data.supplier ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
