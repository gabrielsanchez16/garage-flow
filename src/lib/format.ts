export const money = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtDay = (ts: number) =>
  new Date(ts).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
