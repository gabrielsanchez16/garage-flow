import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentPeriodKey } from "@/lib/period";

interface PeriodState {
  activeKey: string;
  setActive: (k: string) => void;
}

export const usePeriod = create<PeriodState>()(
  persist(
    (set) => ({
      activeKey: currentPeriodKey(),
      setActive: (k) => set({ activeKey: k }),
    }),
    { name: "fsg-active-period" }
  )
);
