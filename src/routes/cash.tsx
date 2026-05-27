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
import { Textarea } from "@/components/ui/textarea";
import { Wallet, ArrowDown, ArrowUp, Lock, Unlock, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cash")({ component: Cash });

function Cash() {
  const [openDlg, setOpenDlg] = useState(false);
  const [closeDlg, setCloseDlg] = useState(false);
  const [moveDlg, setMoveDlg] = useState(false);
  const session = useLiveQuery(() => db.cashSessions.where("status").equals("open").first(), []);
  const movements = useLiveQuery(
    () =>
      session
        ? db.cashMovements.where("sessionId").equals(session.id!).reverse().sortBy("date")
        : Promise.resolve([]),
    [session?.id]
  ) ?? [];
  const history = useLiveQuery(() => db.cashSessions.orderBy("openedAt").reverse().limit(10).toArray(), []) ?? [];

  const income = movements.filter((m) => m.type === "income" || m.type === "sale").reduce((a, b) => a + b.amount, 0);
  const expense = movements.filter((m) => m.type === "expense" || m.type === "withdrawal").reduce((a, b) => a + b.amount, 0);
  const expected = (session?.openingAmount ?? 0) + income - expense;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Caja"
        subtitle="Gestiona apertura, movimientos y cierre"
        action={
          session ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMoveDlg(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Movimiento
              </Button>
              <Button onClick={() => setCloseDlg(true)} className="gap-2">
                <Lock className="h-4 w-4" /> Cerrar caja
              </Button>
            </div>
          ) : (
            <Button onClick={() => setOpenDlg(true)} className="gap-2">
              <Unlock className="h-4 w-4" /> Abrir caja
            </Button>
          )
        }
      />

      {session ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Stat label="Apertura" value={money(session.openingAmount)} icon={Wallet} tone="text-muted-foreground" />
            <Stat label="Ingresos" value={money(income)} icon={ArrowUp} tone="text-emerald-400" />
            <Stat label="Egresos" value={money(expense)} icon={ArrowDown} tone="text-destructive" />
            <Stat label="Esperado" value={money(expected)} icon={Wallet} tone="text-primary" />
          </div>

          <Card className="metallic-border overflow-hidden">
            <div className="p-4 border-b border-border font-semibold">Movimientos de la sesión</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(m.date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.type === "expense" || m.type === "withdrawal" ? "destructive" : "secondary"}>
                          {m.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{m.description}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${m.type === "expense" || m.type === "withdrawal" ? "text-destructive" : "text-emerald-400"}`}>
                        {m.type === "expense" || m.type === "withdrawal" ? "-" : "+"}
                        {money(m.amount)}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
                        Aún no hay movimientos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="metallic-border p-10 text-center">
          <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <div className="font-semibold">No hay caja abierta</div>
          <div className="text-sm text-muted-foreground mt-1">
            Abre una sesión de caja para empezar a registrar ventas en efectivo.
          </div>
        </Card>
      )}

      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-8 mb-3">
        Historial de cajas
      </h3>
      <Card className="metallic-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Apertura</th>
                <th className="px-4 py-3">Cierre</th>
                <th className="px-4 py-3 text-right">Inicial</th>
                <th className="px-4 py-3 text-right">Esperado</th>
                <th className="px-4 py-3 text-right">Real</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(s.openedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.closedAt ? fmtDate(s.closedAt) : <Badge>Abierta</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">{money(s.openingAmount)}</td>
                  <td className="px-4 py-3 text-right">{s.expectedAmount ? money(s.expectedAmount) : "—"}</td>
                  <td className="px-4 py-3 text-right">{s.closingAmount ? money(s.closingAmount) : "—"}</td>
                  <td className={`px-4 py-3 text-right ${(s.difference ?? 0) < 0 ? "text-destructive" : "text-emerald-400"}`}>
                    {s.difference != null ? money(s.difference) : "—"}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    Aún no hay sesiones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <OpenDialog open={openDlg} onOpenChange={setOpenDlg} />
      <MovementDialog open={moveDlg} onOpenChange={setMoveDlg} sessionId={session?.id} />
      <CloseDialog open={closeDlg} onOpenChange={setCloseDlg} expected={expected} sessionId={session?.id} />
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: any) {
  return (
    <Card className="metallic-border kpi-shine p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className={`text-2xl font-bold mt-2 ${tone}`}>{value}</div>
    </Card>
  );
}

function OpenDialog({ open, onOpenChange }: any) {
  const [amount, setAmount] = useState(0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Monto inicial</Label>
          <Input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="h-12 text-lg"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              await db.cashSessions.add({
                openedAt: Date.now(),
                openingAmount: amount,
                status: "open",
              });
              toast.success("Caja abierta");
              onOpenChange(false);
              setAmount(0);
            }}
          >
            Abrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ open, onOpenChange, sessionId }: any) {
  const [type, setType] = useState<"income" | "expense" | "withdrawal">("expense");
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="expense">Gasto</SelectItem>
                <SelectItem value="withdrawal">Retiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Monto</Label>
            <Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!sessionId) return;
              await db.cashMovements.add({
                sessionId,
                date: Date.now(),
                type,
                amount,
                description: desc || type,
              });
              toast.success("Movimiento registrado");
              onOpenChange(false);
              setAmount(0); setDesc("");
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ open, onOpenChange, expected, sessionId }: any) {
  const [real, setReal] = useState(0);
  const diff = real - expected;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <span className="text-sm text-muted-foreground">Esperado</span>
            <span className="font-bold text-primary">{money(expected)}</span>
          </div>
          <Label>Monto real contado</Label>
          <Input type="number" value={real || ""} onChange={(e) => setReal(Number(e.target.value))} className="h-12 text-lg" />
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <span className="text-sm text-muted-foreground">Diferencia</span>
            <span className={`font-bold ${diff < 0 ? "text-destructive" : "text-emerald-400"}`}>{money(diff)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!sessionId) return;
              await db.cashSessions.update(sessionId, {
                status: "closed",
                closedAt: Date.now(),
                closingAmount: real,
                expectedAmount: expected,
                difference: diff,
              });
              toast.success("Caja cerrada");
              onOpenChange(false);
              setReal(0);
            }}
          >
            Cerrar caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
