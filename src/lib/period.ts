export function periodKeyFromDate(d: Date | number): string {
  const x = typeof d === "number" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

export function currentPeriodKey(): string {
  return periodKeyFromDate(new Date());
}

export function periodLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return s.replace(/^./, (c) => c.toUpperCase());
}

export function periodShort(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
  return s.replace(/^./, (c) => c.toUpperCase()).replace(".", "");
}

export function nextPeriodKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 1);
  return periodKeyFromDate(d);
}

export function prevPeriodKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return periodKeyFromDate(d);
}
