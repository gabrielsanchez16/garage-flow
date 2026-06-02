import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type WorkOrder,
  type WOItem,
  type WOStatus,
  type PaymentMethod,
  ensureCurrentPeriod,
} from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { woProfit, woTotal, woCost, newFolio } from "@/lib/accounting";
import { usePeriod } from "@/stores/period";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Plus,
  ClipboardList,
  Wrench,
  Boxes,
  PackageOpen,
  Trash2,
  Lock,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/work-orders")({ component: WorkOrders });

const STATUS: Record<WOStatus, { label: string; tone: string }> = {
  open: { label: "Abierta", tone: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  closed: { label: "Cobrada", tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  delivered: { label: "Entregada", tone: "bg-muted text-muted-foreground border-border" },
};

function WorkOrders() {
  const { activeKey } = usePeriod();
  const [createDlg, setCreateDlg] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const orders = useLiveQuery(
    () => db.workOrders.where("periodKey").equals(activeKey).reverse().sortBy("createdAt"),
    [activeKey]
  ) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Órdenes de servicio"
        subtitle={`${orders.length} órdenes en el período`}
        action={
          <Button onClick={() => setCreateDlg(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva OS
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-3">
        {orders.map((o) => (
          <Card key={o.id} className="metallic-border p-4 cursor-pointer hover:border-primary/40 transition" onClick={() => setEditing(o)}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  {o.folio}
                </div>
                <div className="font-semibold mt-1">{o.customerName}</div>
                <div className="text-sm text-muted-foreground">
                  {o.motorcycle} · <span className="font-mono">{o.plate}</span>
                </div>
                <div className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</div>
              </div>
              <Badge className={`${STATUS[o.status].tone} border`}>{STATUS[o.status].label}</Badge>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{o.items.length} ítems</span>
              <div className="text-lg font-bold text-primary">{money(o.total)}</div>
            </div>
          </Card>
        ))}
        {orders.length === 0 && (
          <Card className="metallic-border lg:col-span-2 p-10 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <div className="text-sm text-muted-foreground">Sin órdenes en este período.</div>
          </Card>
        )}
      </div>

      <CreateDialog open={createDlg} onOpenChange={setCreateDlg} periodKey={activeKey} onCreated={(wo) => setEditing(wo)} />
      <EditorSheet wo={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CreateDialog({ open, onOpenChange, periodKey, onCreated }: { open: boolean; onOpenChange: (b: boolean) => void; periodKey: string; onCreated: (wo: WorkOrder) => void }) {
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? [];
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [motorcycle, setMotorcycle] = useState("");
  const [plate, setPlate] = useState("");
  const [km, setKm] = useState(0);

  function applyCustomer(idStr: string) {
    setCustomerId(idStr);
    const c = customers.find((x) => x.id === Number(idStr));
    if (c) {
      setCustomerName(c.name);
      setMotorcycle(c.motorcycle ?? "");
      setPlate(c.plate ?? "");
      setKm(c.km ?? 0);
    }
  }

  async function create() {
    if (!customerName || !plate) return toast.error("Cliente y placa requeridos");
    await ensureCurrentPeriod();
    const id = await db.workOrders.add({
      folio: newFolio(),
      periodKey,
      createdAt: Date.now(),
      status: "open",
      customerId: customerId ? Number(customerId) : undefined,
      customerName,
      motorcycle,
      plate: plate.toUpperCase(),
      km,
      items: [],
      total: 0,
    });
    const wo = await db.workOrders.get(id as number);
    toast.success("OS creada");
    onOpenChange(false);
    setCustomerId(""); setCustomerName(""); setMotorcycle(""); setPlate(""); setKm(0);
    if (wo) onCreated(wo);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva orden de servicio</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente existente</Label>
            <Select value={customerId} onValueChange={applyCustomer}>
              <SelectTrigger><SelectValue placeholder="Selecciona o llena abajo…" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} · {c.plate ?? "—"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nombre cliente</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Moto</Label><Input value={motorcycle} onChange={(e) => setMotorcycle(e.target.value)} /></div>
            <div><Label>Placa</Label><Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="font-mono" /></div>
          </div>
          <div><Label>Kilometraje</Label><Input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={create}>Crear y abrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorSheet({ wo, onClose }: { wo: WorkOrder | null; onClose: () => void }) {
  const [items, setItems] = useState<WOItem[]>([]);
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [closeDlg, setCloseDlg] = useState(false);
  const services = useLiveQuery(() => db.services.toArray(), []) ?? [];
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const mechanics = useLiveQuery(() => db.mechanics.where("active").equals(1).or("active").equals("true" as unknown as number).toArray().catch(() => db.mechanics.toArray()), []) ?? [];
  const allMechs = useLiveQuery(() => db.mechanics.toArray(), []) ?? [];

  useEffect(() => {
    if (wo) {
      setItems(wo.items);
      setNotes(wo.notes ?? "");
      setDiagnosis(wo.diagnosis ?? "");
    }
  }, [wo]);

  const profit = useMemo(() => woProfit(items), [items]);
  const total = useMemo(() => woTotal(items), [items]);
  const cost = useMemo(() => woCost(items), [items]);

  if (!wo) return null;

  async function save() {
    await db.workOrders.update(wo!.id!, { items, total, notes, diagnosis });
    toast.success("Cambios guardados");
  }

  async function deleteIt() {
    if (!confirm(`¿Eliminar ${wo!.folio}?`)) return;
    await db.workOrders.delete(wo!.id!);
    toast.success("Eliminada");
    onClose();
  }

  function addLabor(serviceId: string) {
    const s = services.find((x) => x.id === Number(serviceId));
    if (!s) return;
    setItems((arr) => [...arr, {
      kind: "labor",
      serviceId: s.id,
      name: s.name,
      qty: 1,
      price: s.price,
      insumos: s.insumosCost,
      mechanicPay: s.mechanicPay,
      shopProfit: s.shopProfit,
      mechanicId: wo!.defaultMechanicId,
    }]);
  }

  function addShopPart(productId: string) {
    const p = products.find((x) => x.id === Number(productId));
    if (!p) return;
    if (p.stock <= 0) return toast.error("Sin stock");
    setItems((arr) => [...arr, {
      kind: "shop_part",
      productId: p.id!,
      productType: p.type,
      name: p.name,
      qty: 1,
      unitPrice: p.price,
      unitCost: p.cost,
    }]);
  }

  const allActiveMechs = allMechs.filter((m) => m.active);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-[640px] bg-card border-l border-border overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground font-mono">{wo.folio}</div>
            <div className="font-semibold truncate">{wo.customerName} · {wo.plate}</div>
          </div>
          <Badge className={`${STATUS[wo.status].tone} border`}>{STATUS[wo.status].label}</Badge>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-muted/30">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Moto</div>
              <div className="font-medium mt-1">{wo.motorcycle}</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Km</div>
              <div className="font-medium mt-1">{wo.km.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <Label>Diagnóstico</Label>
            <Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          <Tabs defaultValue="labor">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="labor"><Wrench className="h-3 w-3 mr-1" />Mano de obra</TabsTrigger>
              <TabsTrigger value="shop"><Boxes className="h-3 w-3 mr-1" />Taller</TabsTrigger>
              <TabsTrigger value="external"><PackageOpen className="h-3 w-3 mr-1" />Externo</TabsTrigger>
            </TabsList>

            <TabsContent value="labor" className="mt-3 space-y-2">
              <Select onValueChange={addLabor} value="">
                <SelectTrigger><SelectValue placeholder="+ Agregar servicio…" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name} · {money(s.price)}</SelectItem>)}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="shop" className="mt-3 space-y-2">
              <Select onValueChange={addShopPart} value="">
                <SelectTrigger><SelectValue placeholder="+ Agregar repuesto/bebida…" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} · stock {p.stock} · {money(p.price)}</SelectItem>)}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="external" className="mt-3 space-y-2">
              <ExternalForm onAdd={(it) => setItems((arr) => [...arr, it])} />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            {items.map((it, i) => (
              <ItemRow key={i} item={it} mechanics={allActiveMechs} onChange={(next) => setItems((arr) => arr.map((x, j) => j === i ? next : x))} onRemove={() => setItems((arr) => arr.filter((_, j) => j !== i))} />
            ))}
            {items.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Aún no hay ítems en la orden.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Box label="Total cliente" v={money(total)} tone="text-primary text-lg" />
            <Box label="Costo" v={money(cost)} tone="text-muted-foreground" />
            <Box label="Mecánico" v={money(profit.mecanico)} tone="text-blue-400" />
            <Box label="Ganancia taller" v={money(profit.total)} tone="text-emerald-400" />
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={deleteIt} className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={save} className="flex-1">Guardar cambios</Button>
            {wo.status === "open" && (
              <Button onClick={() => setCloseDlg(true)} className="flex-1 gap-2">
                <Lock className="h-4 w-4" /> Cobrar y cerrar
              </Button>
            )}
            {wo.status === "closed" && (
              <Button onClick={async () => {
                await db.workOrders.update(wo.id!, { status: "delivered" });
                toast.success("Marcada como entregada");
                onClose();
              }} className="flex-1 gap-2">
                <Truck className="h-4 w-4" /> Entregar
              </Button>
            )}
          </div>
        </div>

        <CloseDialog open={closeDlg} onOpenChange={setCloseDlg} wo={wo} items={items} total={total} notes={notes} diagnosis={diagnosis} onDone={onClose} />
      </div>
    </div>
  );
}

function Box({ label, v, tone = "" }: { label: string; v: string; tone?: string }) {
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-bold mt-1 ${tone}`}>{v}</div>
    </div>
  );
}

function ItemRow({ item, mechanics, onChange, onRemove }: { item: WOItem; mechanics: { id?: number; name: string }[]; onChange: (it: WOItem) => void; onRemove: () => void }) {
  const subtotal = item.kind === "labor" ? item.price * item.qty : item.unitPrice * item.qty;
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {item.kind === "labor" ? "Mano de obra" : item.kind === "shop_part" ? (item.productType === "bebida" ? "Bebida" : "Repuesto") : "Externo"}
            </Badge>
          </div>
          <div className="font-medium text-sm mt-1 truncate">{item.name}</div>
        </div>
        <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-[60px_1fr_auto] gap-2 items-end mt-3">
        <div>
          <Label className="text-[10px]">Cant.</Label>
          <Input type="number" value={item.qty} onChange={(e) => onChange({ ...item, qty: Math.max(1, Number(e.target.value)) })} className="h-8 text-center" />
        </div>
        <div>
          <Label className="text-[10px]">Precio unit.</Label>
          <Input
            type="number"
            value={item.kind === "labor" ? item.price : item.unitPrice}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (item.kind === "labor") onChange({ ...item, price: v });
              else onChange({ ...item, unitPrice: v });
            }}
            className="h-8"
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Subtotal</div>
          <div className="font-bold text-primary">{money(subtotal)}</div>
        </div>
      </div>
      {item.kind === "labor" && (
        <div className="mt-2">
          <Label className="text-[10px]">Mecánico asignado</Label>
          <Select value={item.mechanicId ? String(item.mechanicId) : ""} onValueChange={(v) => onChange({ ...item, mechanicId: v ? Number(v) : undefined })}>
            <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {mechanics.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function ExternalForm({ onAdd }: { onAdd: (it: WOItem) => void }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState(0);
  const [markup, setMarkup] = useState(30);
  const [qty, setQty] = useState(1);
  const sale = Math.round(cost * (1 + markup / 100));
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-dashed border-border space-y-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del repuesto externo" />
      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-[10px]">Costo</Label><Input type="number" value={cost || ""} onChange={(e) => setCost(Number(e.target.value))} /></div>
        <div><Label className="text-[10px]">Markup %</Label><Input type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} /></div>
        <div><Label className="text-[10px]">Cant.</Label><Input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} /></div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Venta: <span className="font-semibold text-primary">{money(sale)}</span></span>
        <Button size="sm" onClick={async () => {
          if (!name || cost <= 0) return toast.error("Nombre y costo requeridos");
          onAdd({ kind: "external_part", name, qty, unitPrice: sale, unitCost: cost, markupPct: markup });
          // record cash outflow for the purchase
          await ensureCurrentPeriod();
          const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
          await db.cashMovements.add({
            date: Date.now(),
            periodKey,
            type: "external_part_purchase",
            amount: cost * qty,
            description: `Compra externa · ${name} x${qty}`,
            paymentMethod: "cash",
          });
          toast.success("Agregado · compra registrada en caja");
          setName(""); setCost(0); setMarkup(30); setQty(1);
        }}>Agregar</Button>
      </div>
    </div>
  );
}

function CloseDialog({ open, onOpenChange, wo, items, total, notes, diagnosis, onDone }: { open: boolean; onOpenChange: (b: boolean) => void; wo: WorkOrder; items: WOItem[]; total: number; notes: string; diagnosis: string; onDone: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  async function confirm() {
    await db.workOrders.update(wo.id!, { items, total, notes, diagnosis, status: "closed", paymentMethod: method, closedAt: Date.now() });
    // Inventory: discount shop parts
    for (const it of items) {
      if (it.kind === "shop_part") {
        const p = await db.products.get(it.productId);
        if (p) {
          await db.products.update(it.productId, { stock: Math.max(0, p.stock - it.qty) });
          await db.inventoryMovements.add({
            date: Date.now(), productId: it.productId, type: "out", qty: it.qty, reason: `OS ${wo.folio}`,
          });
        }
      }
    }
    // Cash in: WO payment (cash or mixed)
    if (method === "cash" || method === "mixed") {
      await db.cashMovements.add({
        date: Date.now(),
        periodKey: wo.periodKey,
        type: "wo_payment",
        amount: total,
        refId: wo.id,
        description: `Cobro ${wo.folio}`,
        paymentMethod: method,
      });
    }
    toast.success("OS cerrada y cobrada");
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cobrar {money(total)}</DialogTitle></DialogHeader>
        <div className="space-y-3">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm}>Confirmar cobro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
