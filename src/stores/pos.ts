import { create } from "zustand";
import type { SaleItem } from "@/lib/db";

interface PosState {
  items: SaleItem[];
  discount: number;
  add: (it: SaleItem) => void;
  remove: (idx: number) => void;
  setQty: (idx: number, qty: number) => void;
  setDiscount: (d: number) => void;
  clear: () => void;
}

export const usePos = create<PosState>((set) => ({
  items: [],
  discount: 0,
  add: (it) =>
    set((s) => {
      const existing = s.items.findIndex((x) => x.kind === it.kind && x.refId === it.refId);
      if (existing >= 0) {
        const items = [...s.items];
        items[existing] = { ...items[existing], qty: items[existing].qty + it.qty };
        return { items };
      }
      return { items: [...s.items, it] };
    }),
  remove: (idx) => set((s) => ({ items: s.items.filter((_, i) => i !== idx) })),
  setQty: (idx, qty) =>
    set((s) => {
      const items = [...s.items];
      items[idx] = { ...items[idx], qty: Math.max(1, qty) };
      return { items };
    }),
  setDiscount: (d) => set({ discount: Math.max(0, d) }),
  clear: () => set({ items: [], discount: 0 }),
}));
