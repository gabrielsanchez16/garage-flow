import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/backups")({ component: Backups });

const tableNames = [
  "products", "services", "customers", "sales", "purchases",
  "cashSessions", "cashMovements", "inventoryMovements", "workOrders", "settings",
] as const;

function Backups() {
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportAll() {
    const data: Record<string, unknown[]> = {};
    for (const t of tableNames) {
      data[t] = await (db as any)[t].toArray();
    }
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: Date.now(), data }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fullstack-garage-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  }

  async function importBackup(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = parsed.data ?? parsed;
      if (!confirm("Esto reemplazará todos los datos actuales. ¿Continuar?")) return;
      for (const t of tableNames) {
        await (db as any)[t].clear();
        if (Array.isArray(data[t])) {
          await (db as any)[t].bulkAdd(data[t]);
        }
      }
      toast.success("Backup restaurado");
    } catch (e) {
      toast.error("Archivo inválido");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-[1000px] mx-auto">
      <PageHeader title="Backups" subtitle="Respalda tu información local" />

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="metallic-border p-5">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Download className="h-5 w-5" />
          </div>
          <div className="font-semibold mt-3">Exportar backup</div>
          <p className="text-sm text-muted-foreground mt-1">
            Descarga un archivo JSON con todos los datos del taller.
          </p>
          <Button onClick={exportAll} className="mt-4 w-full gap-2">
            <Download className="h-4 w-4" /> Exportar JSON
          </Button>
        </Card>

        <Card className="metallic-border p-5">
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 grid place-items-center">
            <Upload className="h-5 w-5" />
          </div>
          <div className="font-semibold mt-3">Restaurar backup</div>
          <p className="text-sm text-muted-foreground mt-1">
            Importa un archivo JSON previamente exportado. Esta acción reemplaza tus datos.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} variant="outline" className="mt-4 w-full gap-2">
            <Upload className="h-4 w-4" /> Seleccionar archivo
          </Button>
        </Card>
      </div>

      <Card className="metallic-border p-5 mt-4">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Almacenamiento 100% local</div>
            <p className="text-muted-foreground mt-1">
              Toda tu información se guarda offline en IndexedDB de este dispositivo. Realiza backups
              con frecuencia y guárdalos en un lugar seguro.
            </p>
          </div>
        </div>
      </Card>

      <Card className="metallic-border p-5 mt-3 border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-400">Importante</div>
            <p className="text-muted-foreground mt-1">
              Limpiar la caché del navegador o desinstalar la PWA borrará tus datos. Exporta backups regularmente.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
