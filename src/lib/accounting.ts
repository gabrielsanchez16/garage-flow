import { db, type WorkOrder, type WOItem } from "@/lib/db";

export interface ProfitBreakdown {
  bebidas: number;
  repuestosTaller: number;
  repuestosExternos: number;
  manoObra: number; // shopProfit + insumos
  insumos: number; // detalle, ya incluido en manoObra
  mecanico: number; // por pagar (acumulado, antes de payouts)
  total: number;
}

export function woProfit(items: WOItem[]): ProfitBreakdown {
  const b = { bebidas: 0, repuestosTaller: 0, repuestosExternos: 0, manoObra: 0, insumos: 0, mecanico: 0, total: 0 };
  for (const it of items) {
    if (it.kind === "shop_part") {
      const profit = (it.unitPrice - it.unitCost) * it.qty;
      if (it.productType === "bebida") b.bebidas += profit;
      else b.repuestosTaller += profit;
    } else if (it.kind === "external_part") {
      b.repuestosExternos += (it.unitPrice - it.unitCost) * it.qty;
    } else if (it.kind === "labor") {
      b.insumos += it.insumos * it.qty;
      b.manoObra += (it.shopProfit + it.insumos) * it.qty;
      b.mecanico += it.mechanicPay * it.qty;
    }
  }
  b.total = b.bebidas + b.repuestosTaller + b.repuestosExternos + b.manoObra;
  return b;
}

export function woTotal(items: WOItem[]): number {
  let t = 0;
  for (const it of items) {
    if (it.kind === "labor") t += it.price * it.qty;
    else t += it.unitPrice * it.qty;
  }
  return t;
}

export function woCost(items: WOItem[]): number {
  let c = 0;
  for (const it of items) {
    if (it.kind === "shop_part" || it.kind === "external_part") c += it.unitCost * it.qty;
    else c += (it.insumos + it.mechanicPay) * it.qty;
  }
  return c;
}

export async function periodKPIs(periodKey: string) {
  const [wos, sales, expenses, payouts, movements] = await Promise.all([
    db.workOrders.where("periodKey").equals(periodKey).toArray(),
    db.sales.where("periodKey").equals(periodKey).toArray(),
    db.expenses.where("periodKey").equals(periodKey).toArray(),
    db.mechanicPayouts.where("periodKey").equals(periodKey).toArray(),
    db.cashMovements.where("periodKey").equals(periodKey).toArray(),
  ]);

  const closed = wos.filter((w) => w.status === "closed" || w.status === "delivered");

  const profit: ProfitBreakdown = { bebidas: 0, repuestosTaller: 0, repuestosExternos: 0, manoObra: 0, insumos: 0, mecanico: 0, total: 0 };
  let revenueWO = 0;
  let costWO = 0;

  for (const w of closed) {
    const p = woProfit(w.items);
    profit.bebidas += p.bebidas;
    profit.repuestosTaller += p.repuestosTaller;
    profit.repuestosExternos += p.repuestosExternos;
    profit.manoObra += p.manoObra;
    profit.insumos += p.insumos;
    profit.mecanico += p.mecanico;
    revenueWO += w.total;
    costWO += woCost(w.items);
  }

  // POS sales: bebidas / repuestos separately
  let revenuePOS = 0;
  let costPOS = 0;
  for (const s of sales) {
    revenuePOS += s.total;
    costPOS += s.cost;
    for (const it of s.items) {
      if (it.kind === "product") {
        const p = (it.price - it.cost) * it.qty;
        if (it.productType === "bebida") profit.bebidas += p;
        else profit.repuestosTaller += p;
      } else {
        profit.manoObra += (it.price - it.cost) * it.qty;
      }
    }
  }
  profit.total = profit.bebidas + profit.repuestosTaller + profit.repuestosExternos + profit.manoObra;

  const expensesTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const payoutsTotal = payouts.reduce((a, p) => a + p.amount, 0);

  // cash expected from movements ledger (positive types - negative types)
  const ins = ["wo_payment", "pos_sale", "adjust_in"];
  const outs = ["external_part_purchase", "expense", "mechanic_payout", "adjust_out"];
  let cashIn = 0;
  let cashOut = 0;
  for (const m of movements) {
    if (ins.includes(m.type)) cashIn += m.amount;
    else if (outs.includes(m.type)) cashOut += m.amount;
  }

  return {
    revenue: revenueWO + revenuePOS,
    cost: costWO + costPOS,
    profit,
    expenses: expensesTotal,
    mechanicOwed: Math.max(0, profit.mecanico - payoutsTotal),
    mechanicPaid: payoutsTotal,
    cashExpected: cashIn - cashOut,
    cashIn,
    cashOut,
    workOrders: { total: wos.length, open: wos.length - closed.length, closed: closed.length },
  };
}

export async function mechanicEarnings(periodKey: string) {
  const [wos, payouts, mechanics] = await Promise.all([
    db.workOrders.where("periodKey").equals(periodKey).toArray(),
    db.mechanicPayouts.where("periodKey").equals(periodKey).toArray(),
    db.mechanics.toArray(),
  ]);
  const closed = wos.filter((w) => w.status === "closed" || w.status === "delivered");
  const byMech: Record<number, { earned: number; paid: number; jobs: number }> = {};
  for (const m of mechanics) byMech[m.id!] = { earned: 0, paid: 0, jobs: 0 };
  for (const w of closed) {
    for (const it of w.items) {
      if (it.kind === "labor" && it.mechanicId != null) {
        const slot = byMech[it.mechanicId] ?? (byMech[it.mechanicId] = { earned: 0, paid: 0, jobs: 0 });
        slot.earned += it.mechanicPay * it.qty;
        slot.jobs += 1;
      }
    }
  }
  for (const p of payouts) {
    const slot = byMech[p.mechanicId] ?? (byMech[p.mechanicId] = { earned: 0, paid: 0, jobs: 0 });
    slot.paid += p.amount;
  }
  return mechanics.map((m) => ({
    mechanic: m,
    earned: byMech[m.id!]?.earned ?? 0,
    paid: byMech[m.id!]?.paid ?? 0,
    pending: (byMech[m.id!]?.earned ?? 0) - (byMech[m.id!]?.paid ?? 0),
    jobs: byMech[m.id!]?.jobs ?? 0,
  }));
}

export function newFolio(): string {
  const d = new Date();
  return `OS-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;
}
