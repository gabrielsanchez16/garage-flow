import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type Settings } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const [s, setS] = useState<Partial<Settings>>({});
  useEffect(() => { db.settings.toArray().then((r) => setS(r[0] ?? {})); }, []);

  async function save() {
    const all = await db.settings.toArray();
    if (all[0]) await db.settings.update(all[0].id!, s);
    else await db.settings.add(s as Settings);
    toast.success("Ajustes guardados");
  }

  return (
    <div className="p-4 md:p-6 max-w-[700px] mx-auto">
      <PageHeader title="Ajustes" subtitle="Información del taller" />
      <Card className="metallic-border p-5 space-y-3">
        <div><Label>Nombre del taller</Label><Input value={s.shopName ?? ""} onChange={(e) => setS({ ...s, shopName: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Moneda</Label><Input value={s.currency ?? ""} onChange={(e) => setS({ ...s, currency: e.target.value })} /></div>
          <div><Label>NIT / RUT</Label><Input value={s.taxId ?? ""} onChange={(e) => setS({ ...s, taxId: e.target.value })} /></div>
        </div>
        <div><Label>Dirección</Label><Input value={s.address ?? ""} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
        <div><Label>Teléfono</Label><Input value={s.phone ?? ""} onChange={(e) => setS({ ...s, phone: e.target.value })} /></div>
        <Button onClick={save} className="w-full">Guardar</Button>
      </Card>
    </div>
  );
}
