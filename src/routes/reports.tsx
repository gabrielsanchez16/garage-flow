import { createFileRoute } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { usePeriod } from "@/stores/period";
import { periodLabel } from "@/lib/period";
import { periodKPIs, mechanicEarnings, woProfit, woCost } from "@/lib/accounting";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/reports")({ component: Reports });

function Reports() {
  const { activeKey } = usePeriod();
  const [kpi, setKpi] = useState<Awaited<ReturnType<typeof periodKPIs>> | null>(null);

  useEffect(() => {
    periodKPIs(activeKey).then(setKpi);
  }, [activeKey]);

  async function exportFull() {
    const [wos, sales, expenses, payouts, movements, mechs, products, customers, services] = await Promise.all([
      db.workOrders.where("periodKey").equals(activeKey).toArray(),
      db.sales.where("periodKey").equals(activeKey).toArray(),
      db.expenses.where("periodKey").equals(activeKey).toArray(),
      db.mechanicPayouts.where("periodKey").equals(activeKey).toArray(),
      db.cashMovements.where("periodKey").equals(activeKey).toArray(),
      mechanicEarnings(activeKey),
      db.products.toArray(),
      db.customers.toArray(),
      db.services.toArray(),
    ]);
    const k = kpi ?? await periodKPIs(activeKey);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Concepto: "Período", Valor: periodLabel(activeKey) },
      { Concepto: "Ingresos totales", Valor: k.revenue },
      { Concepto: "Costos", Valor: k.cost },
      { Concepto: "Ganancia bebidas", Valor: k.profit.bebidas },
      { Concepto: "Ganancia repuestos taller", Valor: k.profit.repuestosTaller },
      { Concepto: "Ganancia repuestos externos", Valor: k.profit.repuestosExternos },
      { Concepto: "Ganancia mano de obra (taller)", Valor: k.profit.manoObra },
      { Concepto: "  · insumos incluidos", Valor: k.profit.insumos },
      { Concepto: "Mecánicos · devengado", Valor: k.profit.mecanico },
      { Concepto: "Mecánicos · pagado", Valor: k.mechanicPaid },
      { Concepto: "Mecánicos · pendiente", Valor: k.mechanicOwed },
      { Concepto: "Gastos del mes", Valor: k.expenses },
      { Concepto: "Caja · ingresos", Valor: k.cashIn },
      { Concepto: "Caja · egresos", Valor: k.cashOut },
      { Concepto: "Caja esperada", Valor: k.cashExpected },
      { Concepto: "OS totales", Valor: k.workOrders.total },
      { Concepto: "OS cerradas", Valor: k.workOrders.closed },
    ]), "Resumen");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wos.map((w) => ({
      Folio: w.folio, Fecha: new Date(w.createdAt).toLocaleString(),
      Cliente: w.customerName, Placa: w.plate, Moto: w.motorcycle,
      Estado: w.status, Items: w.items.length, Total: w.total,
      Costo: woCost(w.items), Ganancia: woProfit(w.items).total,
      Mecánico: w.items.find((i) => i.kind === "labor" && i.mechanicId)?.kind === "labor"
        ? "varios" : "—",
      Método: w.paymentMethod ?? "",
    }))), "Órdenes");

    const itemRows: Record<string, unknown>[] = [];
    for (const w of wos) {
      for (const it of w.items) {
        itemRows.push({
          Folio: w.folio,
          Tipo: it.kind,
          Nombre: it.name,
          Cantidad: it.qty,
          PrecioUnit: it.kind === "labor" ? it.price : it.unitPrice,
          Subtotal: (it.kind === "labor" ? it.price : it.unitPrice) * it.qty,
          Insumos: it.kind === "labor" ? it.insumos * it.qty : "",
          Mecánico: it.kind === "labor" ? it.mechanicPay * it.qty : "",
          GananciaTaller: it.kind === "labor" ? it.shopProfit * it.qty
            : it.kind === "shop_part" || it.kind === "external_part" ? (it.unitPrice - it.unitCost) * it.qty : 0,
        });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), "Ítems OS");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Categoría: "Bebidas", Ganancia: k.profit.bebidas },
      { Categoría: "Repuestos taller", Ganancia: k.profit.repuestosTaller },
      { Categoría: "Repuestos externos", Ganancia: k.profit.repuestosExternos },
      { Categoría: "Mano de obra (taller)", Ganancia: k.profit.manoObra },
    ]), "Ganancias por tipo");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mechs.map((r) => ({
      Mecánico: r.mechanic.name, Teléfono: r.mechanic.phone ?? "",
      Trabajos: r.jobs, Devengado: r.earned, Pagado: r.paid, Pendiente: r.pending,
    }))), "Mecánicos");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map((e) => ({
      Fecha: new Date(e.date).toLocaleString(), Categoría: e.category,
      Concepto: e.concept, Método: e.paymentMethod, Monto: e.amount,
    }))), "Gastos");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payouts.map((p) => ({
      Fecha: new Date(p.paidAt).toLocaleString(),
      Mecánico: mechs.find((m) => m.mechanic.id === p.mechanicId)?.mechanic.name ?? "",
      Monto: p.amount, Nota: p.note ?? "",
    }))), "Pagos a mecánicos");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sales.map((s) => ({
      ID: s.id, Fecha: new Date(s.date).toLocaleString(),
      Items: s.items.length, Total: s.total, Costo: s.cost, Utilidad: s.profit,
      Método: s.paymentMethod,
    }))), "Ventas POS");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movements.map((m) => ({
      Fecha: new Date(m.date).toLocaleString(), Tipo: m.type,
      Descripción: m.description, Método: m.paymentMethod ?? "", Monto: m.amount,
    }))), "Caja");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(products.map((p) => ({
      SKU: p.sku, Nombre: p.name, Tipo: p.type, Categoría: p.category,
      Stock: p.stock, Mínimo: p.minStock, Costo: p.cost, Precio: p.price,
      ValorStock: p.stock * p.cost,
    }))), "Inventario");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers.map((c) => ({
      Nombre: c.name, Teléfono: c.phone ?? "", Moto: c.motorcycle ?? "",
      Placa: c.plate ?? "", Km: c.km ?? 0,
    }))), "Clientes");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(services.map((s) => ({
      Nombre: s.name, Categoría: s.category, Precio: s.price,
      Insumos: s.insumosCost, Mecánico: s.mechanicPay, GananciaTaller: s.shopProfit,
      TiempoMin: s.estimatedMinutes,
    }))), "Servicios");

    XLSX.writeFile(wb, `fullstack-garage-${activeKey}.xlsx`);
    toast.success("Reporte completo exportado");
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <PageHeader title="Reportes" subtitle={`Exporta toda la información de ${periodLabel(activeKey)} a Excel`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="metallic-border kpi-shine p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ingresos</div>
          <div className="text-2xl font-bold mt-2 text-primary">{money(kpi?.revenue ?? 0)}</div>
        </Card>
        <Card className="metallic-border kpi-shine p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ganancia</div>
          <div className="text-2xl font-bold mt-2 text-emerald-400">{money(kpi?.profit.total ?? 0)}</div>
        </Card>
        <Card className="metallic-border kpi-shine p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Gastos</div>
          <div className="text-2xl font-bold mt-2 text-destructive">{money(kpi?.expenses ?? 0)}</div>
        </Card>
        <Card className="metallic-border kpi-shine p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Caja esperada</div>
          <div className="text-2xl font-bold mt-2">{money(kpi?.cashExpected ?? 0)}</div>
        </Card>
      </div>

      <Card className="metallic-border p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">Reporte completo del período</div>
            <p className="text-sm text-muted-foreground mt-1">
              Genera un archivo .xlsx con 11 hojas: resumen, órdenes, ítems, ganancias por tipo, mecánicos, gastos, pagos, ventas POS, caja, inventario y clientes.
            </p>
            <Button onClick={exportFull} className="mt-4 gap-2">
              <Download className="h-4 w-4" /> Descargar Excel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
