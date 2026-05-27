import Dexie, { type Table } from "dexie";

export interface Product {
  id?: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  supplier?: string;
  createdAt: number;
}

export interface Service {
  id?: number;
  name: string;
  price: number;
  cost: number;
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

export interface SaleItem {
  kind: "product" | "service";
  refId: number;
  name: string;
  qty: number;
  price: number;
  cost: number;
}

export interface Sale {
  id?: number;
  date: number;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  cost: number;
  profit: number;
  paymentMethod: "cash" | "transfer" | "card" | "mixed";
  customerId?: number;
  cashSessionId?: number;
}

export interface Purchase {
  id?: number;
  date: number;
  supplier: string;
  invoice?: string;
  items: { productId: number; name: string; qty: number; cost: number }[];
  total: number;
}

export interface CashSession {
  id?: number;
  openedAt: number;
  closedAt?: number;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  status: "open" | "closed";
  notes?: string;
}

export interface CashMovement {
  id?: number;
  sessionId: number;
  date: number;
  type: "income" | "expense" | "withdrawal" | "sale";
  amount: number;
  description: string;
}

export interface InventoryMovement {
  id?: number;
  date: number;
  productId: number;
  type: "in" | "out" | "adjust";
  qty: number;
  reason: string;
}

export interface WorkOrder {
  id?: number;
  date: number;
  customerId?: number;
  customerName: string;
  motorcycle: string;
  plate: string;
  km: number;
  diagnosis: string;
  work: string;
  parts: { name: string; qty: number; price: number }[];
  notes?: string;
  status: "pending" | "in_progress" | "done" | "delivered";
  total: number;
}

export interface Settings {
  id?: number;
  shopName: string;
  currency: string;
  taxId?: string;
  address?: string;
  phone?: string;
}

export class GarageDB extends Dexie {
  products!: Table<Product, number>;
  services!: Table<Service, number>;
  customers!: Table<Customer, number>;
  sales!: Table<Sale, number>;
  purchases!: Table<Purchase, number>;
  cashSessions!: Table<CashSession, number>;
  cashMovements!: Table<CashMovement, number>;
  inventoryMovements!: Table<InventoryMovement, number>;
  workOrders!: Table<WorkOrder, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super("fullstack_garage");
    this.version(1).stores({
      products: "++id, sku, name, category, stock",
      services: "++id, name",
      customers: "++id, name, phone, plate",
      sales: "++id, date, paymentMethod, cashSessionId",
      purchases: "++id, date, supplier",
      cashSessions: "++id, status, openedAt",
      cashMovements: "++id, sessionId, date, type",
      inventoryMovements: "++id, productId, date, type",
      workOrders: "++id, date, status, plate",
      settings: "++id",
    });
  }
}

export const db = new GarageDB();

export async function seedIfEmpty() {
  const count = await db.products.count();
  if (count > 0) return;

  await db.settings.add({
    shopName: "FullStack Garage",
    currency: "COP",
    phone: "+57 300 000 0000",
    address: "Cra 10 #20-30",
  });

  await db.products.bulkAdd([
    { name: "Aceite Motul 5100 10W40", sku: "ACE-001", category: "Lubricantes", stock: 24, minStock: 5, cost: 35000, price: 55000, supplier: "Motul CO", createdAt: Date.now() },
    { name: "Filtro de aceite K&N", sku: "FIL-002", category: "Filtros", stock: 12, minStock: 4, cost: 18000, price: 32000, supplier: "K&N", createdAt: Date.now() },
    { name: "Bujía NGK Iridium", sku: "BUJ-003", category: "Encendido", stock: 8, minStock: 6, cost: 22000, price: 42000, supplier: "NGK", createdAt: Date.now() },
    { name: "Pastillas de freno Brembo", sku: "FRE-004", category: "Frenos", stock: 3, minStock: 5, cost: 60000, price: 95000, supplier: "Brembo", createdAt: Date.now() },
    { name: "Cadena DID 520", sku: "TRA-005", category: "Transmisión", stock: 5, minStock: 2, cost: 180000, price: 260000, supplier: "DID", createdAt: Date.now() },
    { name: "Llanta Pirelli Diablo 120/70", sku: "LLA-006", category: "Llantas", stock: 6, minStock: 3, cost: 280000, price: 420000, supplier: "Pirelli", createdAt: Date.now() },
    { name: "Kit de arrastre Renthal", sku: "TRA-007", category: "Transmisión", stock: 2, minStock: 2, cost: 320000, price: 480000, supplier: "Renthal", createdAt: Date.now() },
    { name: "Refrigerante Motul", sku: "REF-008", category: "Lubricantes", stock: 15, minStock: 4, cost: 25000, price: 42000, supplier: "Motul CO", createdAt: Date.now() },
  ]);

  await db.services.bulkAdd([
    { name: "Cambio de aceite", price: 35000, cost: 5000, estimatedMinutes: 20, description: "Incluye drenado y revisión." },
    { name: "Ajuste de válvulas", price: 180000, cost: 30000, estimatedMinutes: 120 },
    { name: "Mantenimiento CVT", price: 120000, cost: 20000, estimatedMinutes: 90 },
    { name: "Cambio de clutch", price: 220000, cost: 50000, estimatedMinutes: 150 },
    { name: "Scanner / Diagnóstico", price: 50000, cost: 0, estimatedMinutes: 30 },
    { name: "Mano de obra (hora)", price: 60000, cost: 0, estimatedMinutes: 60 },
  ]);

  await db.customers.bulkAdd([
    { name: "Carlos Ramírez", phone: "3001234567", motorcycle: "Yamaha MT-03", plate: "ABC12D", km: 14500, createdAt: Date.now() },
    { name: "María López", phone: "3015551122", motorcycle: "Honda CB190R", plate: "XYZ89E", km: 8200, createdAt: Date.now() },
    { name: "Andrés Gómez", phone: "3109998877", motorcycle: "KTM Duke 390", plate: "MOT22F", km: 22100, createdAt: Date.now() },
  ]);
}
