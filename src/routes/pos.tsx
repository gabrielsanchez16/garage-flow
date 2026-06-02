import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type SaleItem, type PaymentMethod } from "@/lib/db";
import { usePos } from "@/stores/pos";
import { usePeriod } from "@/stores/period";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Plus, Minus, Trash2, Search, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/pos")({ component: Pos });

function Pos() {
  const [q, setQ] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);

  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const { items, add, remove, setQty, discount, setDiscount, clear } = usePos();

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );

  const subtotal = items.reduce((a, b) => a + b.qty * b.price, 0);
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="POS rápido"
        subtitle="Venta directa de bebidas / repuestos sueltos (sin orden de servicio)"
        action={
          <Button variant="default" className="lg:hidden gap-2" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-4 w-4" />
            {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div>
          <div className="flex items-center gap-2 px-3 h-11 mb-4 rounded-xl bg-muted/40 border border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className="bg-transparent outline-none flex-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  if (p.stock <= 0) return toast.error("Sin stock");
                  add({
                    kind: "product",
                    refId: p.id!,
                    name: p.name,
                    qty: 1,
                    price: p.price,
                    cost: p.cost,
                    productType: p.type,
                  });
                  toast.success(`${p.name} agregado`);
                }}
                className="text-left p-4 rounded-2xl metallic-border bg-card hover:border-primary/40 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="text-[10px] capitalize">{p.type}</Badge>
                  <Badge variant={p.stock <= p.minStock ? "destructive" : "outline"} className="text-[10px]">{p.stock}</Badge>
                </div>
                <div className="font-medium text-sm mt-3 line-clamp-2 min-h-10">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.sku}</div>
                <div className="text-base font-bold text-primary mt-2">{money(p.price)}</div>
              </button>
            ))}
          </div>
        </div>

        <Cart className="hidden lg:flex" items={items} subtotal={subtotal} total={total} discount={discount} setDiscount={setDiscount} setQty={setQty} remove={remove} clear={clear} onCheckout={() => setCheckout(true)} />
      </div>

      <AnimatePresence>
        {cartOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="absolute bottom-0 inset-x-0 max-h-[90vh] rounded-t-3xl bg-card border-t border-border overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="font-semibold">Carrito</div>
                <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <Cart className="flex-1 border-0 rounded-none" items={items} subtotal={subtotal} total={total} discount={discount} setDiscount={setDiscount} setQty={setQty} remove={remove} clear={clear} onCheckout={() => { setCartOpen(false); setCheckout(true); }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CheckoutDialog open={checkout} onOpenChange={setCheckout} items={items} subtotal={subtotal} discount={discount} total={total} onDone={clear} />
    </div>
  );
}

function Cart({ className = "", items, subtotal, total, discount, setDiscount, setQty, remove, clear, onCheckout }: { className?: string; items: SaleItem[]; subtotal: number; total: number; discount: number; setDiscount: (n: number) => void; setQty: (i: number, q: number) => void; remove: (i: number) => void; clear: () => void; onCheckout: () => void }) {
  return (
    <Card className={`${className} flex flex-col h-fit lg:sticky lg:top-20 metallic-border p-0 overflow-hidden`}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="font-semibold">Carrito ({items.length})</div>
        {items.length > 0 && <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive">Vaciar</button>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh] lg:max-h-[55vh]">
        {items.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Selecciona productos
          </div>
        )}
        {items.map((it, i) => (
          <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">{money(it.price)} c/u</div>
              </div>
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(i, it.qty - 1)} className="h-8 w-8 rounded-lg bg-background border border-border grid place-items-center"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-8 text-center text-sm font-medium">{it.qty}</span>
                <button onClick={() => setQty(i, it.qty + 1)} className="h-8 w-8 rounded-lg bg-background border border-border grid place-items-center"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="text-sm font-bold text-primary">{money(it.qty * it.price)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border space-y-3 bg-background/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm gap-2">
          <span className="text-muted-foreground">Descuento</span>
          <Input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="w-28 h-8 text-right" placeholder="0" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary">{money(total)}</span>
        </div>
        <Button className="w-full h-12 text-base font-semibold" disabled={items.length === 0} onClick={onCheckout}>
          Cobrar {money(total)}
        </Button>
      </div>
    </Card>
  );
}

function CheckoutDialog({ open, onOpenChange, items, subtotal, discount, total, onDone }: { open: boolean; onOpenChange: (b: boolean) => void; items: SaleItem[]; subtotal: number; discount: number; total: number; onDone: () => void }) {
  const { activeKey } = usePeriod();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState<number>(0);
  const change = Math.max(0, received - total);

  async function confirm() {
    const cost = items.reduce((a, b) => a + b.cost * b.qty, 0);
    const saleId = await db.sales.add({
      date: Date.now(),
      periodKey: activeKey,
      items,
      subtotal,
      discount,
      total,
      cost,
      profit: total - cost,
      paymentMethod: method,
    });
    for (const it of items) {
      if (it.kind === "product") {
        const p = await db.products.get(it.refId);
        if (p) await db.products.update(it.refId, { stock: Math.max(0, p.stock - it.qty) });
        await db.inventoryMovements.add({ date: Date.now(), productId: it.refId, type: "out", qty: it.qty, reason: `Venta POS #${saleId}` });
      }
    }
    if (method === "cash" || method === "mixed") {
      await db.cashMovements.add({
        date: Date.now(),
        periodKey: activeKey,
        type: "pos_sale",
        amount: total,
        refId: saleId as number,
        description: `Venta POS #${saleId}`,
        paymentMethod: method,
      });
    }
    toast.success("Venta registrada", { description: `Total ${money(total)}` });
    onDone();
    onOpenChange(false);
    setReceived(0);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cobrar {money(total)}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Método</div>
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
          {method === "cash" && (
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recibido</div>
              <Input type="number" value={received || ""} onChange={(e) => setReceived(Number(e.target.value) || 0)} placeholder="0" className="h-12 text-lg" />
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-muted-foreground">Cambio</span>
                <span className="font-bold text-primary">{money(change)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm}>Confirmar cobro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
