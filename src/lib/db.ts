import Dexie, { type Table } from "dexie";

export type ProductType = "repuesto" | "bebida" | "otro";
export type WOStatus = "open" | "closed" | "delivered";
export type PaymentMethod = "cash" | "transfer" | "card" | "mixed";

export interface Product {
  id?: number;
  name: string;
  sku: string;
  category: string;
  type: ProductType;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  supplier?: string;
  createdAt: number;
}

/** Servicio = mano de obra del taller. price = insumos + mechanicPay + shopProfit */
export interface Service {
  id?: number;
  name: string;
  category: string; // mantenimiento, reparación, eléctrico, etc
  price: number;
  insumosCost: number;
  mechanicPay: number;
  shopProfit: number;
  estimatedMinutes: number;
  description?: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  motorcycle?: string;
  plate?: string;
  km?: number;
  createdAt: number;
}

export interface Mechanic {
  id?: number;
  name: string;
  phone?: string;
  active: boolean;
  createdAt: number;
}

/** Ítem dentro de una orden de servicio (discriminated union) */
export type WOItem =
  | {
      kind: "labor";
      serviceId?: number;
      name: string;
      qty: number;
      price: number; // total cliente
      insumos: number; // por unidad
      mechanicPay: number; // por unidad
      shopProfit: number; // por unidad
      mechanicId?: number;
    }
  | {
      kind: "shop_part";
      productId: number;
      productType: ProductType;
      name: string;
      qty: number;
      unitPrice: number;
      unitCost: number;
    }
  | {
      kind: "external_part";
      name: string;
      qty: number;
      unitPrice: number; // precio venta (con markup)
      unitCost: number; // costo de compra
      markupPct: number;
    };

export interface WorkOrder {
  id?: number;
  folio: string;
  periodKey: string;
  createdAt: number;
  closedAt?: number;
  status: WOStatus;
  customerId?: number;
  customerName: string;
  motorcycle: string;
  plate: string;
  km: number;
  defaultMechanicId?: number;
  items: WOItem[];
  total: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  diagnosis?: string;
}

export interface SaleItem {
  kind: "product" | "service";
  refId: number;
  name: string;
  qty: number;
  price: number;
  cost: number;
  productType?: ProductType;
}

export interface Sale {
  id?: number;
  date: number;
  periodKey: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  cost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  customerId?: number;
}

export interface Purchase {
  id?: number;
  date: number;
  periodKey: string;
  supplier: string;
  invoice?: string;
  items: { productId: number; name: string; qty: number; cost: number }[];
  total: number;
}

export interface Expense {
  id?: number;
  date: number;
  periodKey: string;
  category: "arriendo" | "servicios" | "compras" | "nomina" | "otro";
  concept: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface MechanicPayout {
  id?: number;
  mechanicId: number;
  periodKey: string;
  paidAt: number;
  amount: number;
  note?: string;
}

export interface CashMovement {
  id?: number;
  date: number;
  periodKey: string;
  type:
    | "wo_payment"
    | "pos_sale"
    | "external_part_purchase"
    | "expense"
    | "mechanic_payout"
    | "adjust_in"
    | "adjust_out";
  amount: number; // siempre positivo, el tipo define el signo
  refId?: number; // id de WO / Sale / Expense / Payout
  description: string;
  paymentMethod?: PaymentMethod;
}

export interface InventoryMovement {
  id?: number;
  date: number;
  productId: number;
  type: "in" | "out" | "adjust";
  qty: number;
  reason: string;
}

export interface Period {
  key: string; // YYYY-MM
  label: string;
  status: "open" | "closed";
  openedAt: number;
  closedAt?: number;
  snapshot?: Record<string, number>;
}

export interface Settings {
  id?: number;
  shopName: string;
  currency: string;
  taxId?: string;
  address?: string;
  phone?: string;
  activePeriodKey?: string;
}

export class GarageDB extends Dexie {
  products!: Table<Product, number>;
  services!: Table<Service, number>;
  customers!: Table<Customer, number>;
  mechanics!: Table<Mechanic, number>;
  sales!: Table<Sale, number>;
  purchases!: Table<Purchase, number>;
  expenses!: Table<Expense, number>;
  mechanicPayouts!: Table<MechanicPayout, number>;
  cashMovements!: Table<CashMovement, number>;
  inventoryMovements!: Table<InventoryMovement, number>;
  workOrders!: Table<WorkOrder, number>;
  periods!: Table<Period, string>;
  settings!: Table<Settings, number>;

  constructor() {
    super("fullstack_garage_v2");
    this.version(1).stores({
      products: "++id, sku, name, category, type, stock",
      services: "++id, name, category",
      customers: "++id, name, phone, plate",
      mechanics: "++id, name, active",
      sales: "++id, date, periodKey, paymentMethod",
      purchases: "++id, date, periodKey, supplier",
      expenses: "++id, date, periodKey, category",
      mechanicPayouts: "++id, mechanicId, periodKey, paidAt",
      cashMovements: "++id, date, periodKey, type",
      inventoryMovements: "++id, productId, date, type",
      workOrders: "++id, createdAt, periodKey, status, plate",
      periods: "key, status",
      settings: "++id",
    });
  }
}

export const db = new GarageDB();

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

export async function ensureCurrentPeriod(): Promise<string> {
  const key = currentPeriodKey();
  const existing = await db.periods.get(key);
  if (!existing) {
    await db.periods.put({ key, label: periodLabel(key), status: "open", openedAt: Date.now() });
  }
  return key;
}

export async function seedIfEmpty() {
  await ensureCurrentPeriod();

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      shopName: "FullStack Garage",
      currency: "COP",
      phone: "+57 311 603 6787",
      address: "Cra 64 #4-70 Panamericano Buenaventura",
      activePeriodKey: currentPeriodKey(),
    });
  }

  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.products.bulkAdd([
      { name: "Aceite Castrol 20W50", sku: "AC-2050", category: "Aceites", type: "repuesto", stock: 24, minStock: 5, cost: 28000, price: 42000, createdAt: Date.now() },
      { name: "Filtro de aceite genérico", sku: "FA-001", category: "Filtros", type: "repuesto", stock: 18, minStock: 4, cost: 8000, price: 18000, createdAt: Date.now() },
      { name: "Bujía NGK CR8E", sku: "BJ-CR8E", category: "Encendido", type: "repuesto", stock: 30, minStock: 6, cost: 9000, price: 22000, createdAt: Date.now() },
      { name: "Pastillas de freno trasera", sku: "PF-T01", category: "Frenos", type: "repuesto", stock: 12, minStock: 3, cost: 22000, price: 45000, createdAt: Date.now() },
      { name: "Cadena DID 428H x 130", sku: "CD-428", category: "Transmisión", type: "repuesto", stock: 6, minStock: 2, cost: 95000, price: 145000, createdAt: Date.now() },
      { name: "Coca-Cola 400ml", sku: "BB-COC", category: "Bebidas", type: "bebida", stock: 24, minStock: 6, cost: 2500, price: 4000, createdAt: Date.now() },
      { name: "Agua 600ml", sku: "BB-AGU", category: "Bebidas", type: "bebida", stock: 30, minStock: 8, cost: 1500, price: 3000, createdAt: Date.now() },
      { name: "Gatorade naranja", sku: "BB-GAT", category: "Bebidas", type: "bebida", stock: 12, minStock: 4, cost: 4500, price: 7000, createdAt: Date.now() },
    ]);
  }

  const serviceCount = await db.services.count();
  if (serviceCount === 0) {
    await db.services.bulkAdd([
      { name: "Mantenimiento general 100-150cc", category: "Mantenimiento", price: 350000, insumosCost: 80000, mechanicPay: 150000, shopProfit: 120000, estimatedMinutes: 90 },
      { name: "Mantenimiento general 200-300cc", category: "Mantenimiento", price: 420000, insumosCost: 100000, mechanicPay: 180000, shopProfit: 140000, estimatedMinutes: 120 },
      { name: "Cambio de aceite + filtro", category: "Mantenimiento", price: 90000, insumosCost: 30000, mechanicPay: 30000, shopProfit: 30000, estimatedMinutes: 30 },
      { name: "Sincronización carburador", category: "Reparación", price: 80000, insumosCost: 10000, mechanicPay: 40000, shopProfit: 30000, estimatedMinutes: 60 },
      { name: "Cambio pastillas de freno", category: "Frenos", price: 50000, insumosCost: 5000, mechanicPay: 25000, shopProfit: 20000, estimatedMinutes: 30 },
      { name: "Cambio cadena y piñones", category: "Transmisión", price: 70000, insumosCost: 5000, mechanicPay: 40000, shopProfit: 25000, estimatedMinutes: 45 },
      { name: "Diagnóstico eléctrico", category: "Eléctrico", price: 60000, insumosCost: 5000, mechanicPay: 35000, shopProfit: 20000, estimatedMinutes: 45 },
    ]);
  }

  const mechCount = await db.mechanics.count();
  if (mechCount === 0) {
    await db.mechanics.bulkAdd([
      { name: "Carlos M.", phone: "+57 312 555 0010", active: true, createdAt: Date.now() },
      { name: "Andrés P.", phone: "+57 312 555 0020", active: true, createdAt: Date.now() },
    ]);
  }

  const custCount = await db.customers.count();
  if (custCount === 0) {
    await db.customers.bulkAdd([
      { name: "Juan Pérez", phone: "+57 300 111 2233", motorcycle: "Bajaj Pulsar NS 200", plate: "ABC12D", km: 18450, createdAt: Date.now() },
      { name: "María López", phone: "+57 301 222 3344", motorcycle: "Honda CB 125F", plate: "DEF34G", km: 9230, createdAt: Date.now() },
      { name: "Pedro Sánchez", phone: "+57 302 333 4455", motorcycle: "Yamaha FZ 2.0", plate: "GHI56J", km: 32100, createdAt: Date.now() },
    ]);
  }
}
