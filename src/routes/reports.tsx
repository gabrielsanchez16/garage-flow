import { createFileRoute } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";

export const Route = createFileRoute("/reports")({ component: Reports });

function Reports() {
  const sales = useLiveQuery(() => db.sales.toArray(), []) ?? [];
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];

  const revenue = sales.reduce((a, b) => a + b.total, 0);
  const profit = sales.reduce((a, b) => a + b.profit, 0);
  const invValue = products.reduce((a, p) => a + p.stock * p.cost, 0);

  async function exportXlsx(kind: string) {
    const wb = XLSX.utils.book_new();
    if (kind === "sales") {
      const rows = (await db.sales.toArray()).map((s) => ({
        ID: s.id,
        Fecha: new Date(s.date).toLocaleString(),
        Items: s.items.length,
        Subtotal: s.subtotal,
        Descuento: s.discount,
        Total: s.total,
        Costo: s.cost,
        Utilidad: s.profit,
        Método: s.paymentMethod,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Ventas");
    } else if (kind === "inventory") {
      const rows = (await db.products.toArray()).map((p) => ({
        SKU: p.sku, Nombre: p.name, Categoría: p.category, Stock: p.stock,
        Mínimo: p.minStock, Costo: p.cost, Precio: p.price, Proveedor: p.supplier ?? "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Inventario");
    } else if (kind === "purchases") {
      const rows = (await db.purchases.toArray()).map((p) => ({
        ID: p.id, Fecha: new Date(p.date).toLocaleString(),
        Proveedor: p.supplier, Factura: p.invoice ?? "", Total: p.total,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Compras");
    } else if (kind === "cash") {
      const rows = (await db.cashSessions.toArray()).map((s) => ({
        ID: s.id, Apertura: new Date(s.openedAt).toLocaleString(),
        Cierre: s.closedAt ? new Date(s.closedAt).toLocaleString() : "",
        Inicial: s.openingAmount, Esperado: s.expectedAmount ?? "", Real: s.closingAmount ?? "",
        Diferencia: s.difference ?? "", Estado: s.status,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Cajas");
    }
    XLSX.writeFile(wb, `reporte-${kind}-${Date.now()}.xlsx`);
    toast.success("Exportado");
  }

  const reports = [
    { id: "sales", title: "Ventas", desc: "Histórico de ventas con utilidad" },
    { id: "inventory", title: "Inventario", desc: "Stock, costo y precio de productos" },
    { id: "purchases", title: "Compras", desc: "Compras a proveedores" },
    { id: "cash", title: "Caja", desc: "Sesiones y diferencias" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Reportes" subtitle="Exporta tu información a Excel" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Card className="metallic-border kpi-shine p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ingresos totales</div>
          <div className="text-2xl font-bold mt-2 text-primary">{money(revenue)}</div>
        </Card>
        <Card className="metallic-border kpi-shine p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Utilidad total</div>
          <div className="text-2xl font-bold mt-2 text-emerald-400">{money(profit)}</div>
        </Card>
        <Card className="metallic-border kpi-shine p-4 col-span-2 lg:col-span-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Valor inventario</div>
          <div className="text-2xl font-bold mt-2">{money(invValue)}</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card key={r.id} className="metallic-border p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
            </div>
            <Button onClick={() => exportXlsx(r.id)} variant="outline" className="gap-2 shrink-0">
              <Download className="h-4 w-4" /> Excel
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
