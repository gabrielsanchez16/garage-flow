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
    phone: "+57 311 603 6787",
    address: "Cra 64 #4-70 Panamericano Buenaventura",
  });

}
