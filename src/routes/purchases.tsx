import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, PackagePlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/purchases")({ component: Purchases });

function Purchases() {
  const [open, setOpen] = useState(false);
  const purchases = useLiveQuery(() => db.purchases.orderBy("date").reverse().toArray(), []) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Compras"
        subtitle="Registra compras a proveedores y actualiza inventario"
        action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Nueva compra</Button>}
      />

      <Card className="metallic-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3 text-right">Ítems</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.date)}</td>
                  <td className="px-4 py-3 font-medium">{p.supplier}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.invoice ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{p.items.length}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{money(p.total)}</td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                    <PackagePlus className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Aún no hay compras registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <PurchaseDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function PurchaseDialog({ open, onOpenChange }: any) {
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [items, setItems] = useState<{ productId: number; name: string; qty: number; cost: number }[]>([]);
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];

  const total = items.reduce((a, b) => a + b.qty * b.cost, 0);

  function addItem(id: string) {
    const p = products.find((x) => x.id === Number(id));
    if (!p) return;
    setItems((arr) => [...arr, { productId: p.id!, name: p.name, qty: 1, cost: p.cost }]);
  }

  async function save() {
    if (!supplier || items.length === 0) return toast.error("Proveedor e ítems requeridos");
    await db.purchases.add({
      date: Date.now(),
      supplier,
      invoice,
      items,
      total,
    });
    for (const it of items) {
      const p = await db.products.get(it.productId);
      if (p) {
        await db.products.update(it.productId, {
          stock: p.stock + it.qty,
          cost: it.cost,
        });
        await db.inventoryMovements.add({
          date: Date.now(),
          productId: it.productId,
          type: "in",
          qty: it.qty,
          reason: `Compra a ${supplier}`,
        });
      }
    }
    toast.success("Compra registrada e inventario actualizado");
    setSupplier(""); setInvoice(""); setItems([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva compra</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Proveedor</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
            <div><Label>Factura</Label><Input value={invoice} onChange={(e) => setInvoice(e.target.value)} /></div>
          </div>
          <div>
            <Label>Agregar producto</Label>
            <Select onValueChange={addItem}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-center p-2 rounded-lg bg-muted/30 border border-border">
                <div className="text-sm truncate">{it.name}</div>
                <Input type="number" value={it.qty} onChange={(e) => { const v = Number(e.target.value); setItems((arr) => arr.map((x, j) => j === i ? { ...x, qty: v } : x)); }} className="h-8" />
                <Input type="number" value={it.cost} onChange={(e) => { const v = Number(e.target.value); setItems((arr) => arr.map((x, j) => j === i ? { ...x, cost: v } : x)); }} className="h-8" />
                <button onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">{money(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Guardar compra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
