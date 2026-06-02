# Plan: Modelo contable del taller por ciclos mensuales

Voy a refactorizar el sistema para que refleje el flujo real del taller: órdenes de servicio como eje central, descomposición de mano de obra (insumos + mecánico + ganancia), ciclos mensuales con cierre, y reportes de ganancias por tipo y pagos a mecánicos.

## 1. Modelo de datos (Dexie / localStorage)

**Nuevas tablas / cambios:**

- `mechanics` — `{ id, name, phone, active }`
- `services` (rediseñado) — cada servicio de mano de obra trae su desglose:
  - `{ id, name, category (mantenimiento/reparación/otro), price, insumosCost, mechanicPay, shopProfit }`
  - Validación: `insumosCost + mechanicPay + shopProfit = price`
- `products` — añade `type: 'repuesto' | 'bebida' | 'otro'` para separar ganancias
- `workOrders` (rediseñado) — el centro del sistema:
  - `{ id, folio, customerId, bike{plate,brand,model,cc}, status, openedAt, closedAt, mechanicId, items[], totals{...}, periodKey }`
  - `items[]`: `{ kind: 'labor'|'shop_part'|'external_part'|'drink', refId, name, qty, unitPrice, cost, mechanicPay, insumos, shopProfit, mechanicId? }`
- `externalParts` — repuestos comprados de afuera específicamente para una OS:
  - `{ id, workOrderId, name, purchaseCost, markupPct, salePrice, paidFromCash }`
- `expenses` — gastos del taller:
  - `{ id, date, category: 'arriendo'|'servicios'|'compras'|'otro', concept, amount, periodKey }`
- `mechanicPayouts` — registro de pagos hechos a mecánicos:
  - `{ id, mechanicId, periodKey, amount, paidAt, note }`
- `periods` — ciclos mensuales:
  - `{ key: '2026-06', label: 'Junio 2026', status: 'open'|'closed', openedAt, closedAt, snapshot? }`

**Etiquetado por período:** todo registro nuevo recibe `periodKey = YYYY-MM` del período activo. Cambiar de período no borra nada; solo filtra vistas y reportes.

## 2. Flujo de Orden de Servicio (rediseño de `/work-orders`)

Pantalla de detalle de OS con tres pestañas de ítems:

- **Mano de obra** — selector de servicios del catálogo + selector de mecánico asignado al ítem. Auto-calcula insumos/mecánico/ganancia desde el servicio.
- **Repuestos del taller** — busca en inventario (descuenta stock al cerrar OS), tipo repuesto o bebida.
- **Repuestos externos** — formulario inline: nombre, costo de compra, % markup → calcula precio venta. Marca salida de caja al registrar la compra.

Totales en vivo: subtotal, total cliente, costo total, ganancia desglosada (mecánico / taller-repuestos / taller-externos / bebidas / mano-de-obra-taller).

Al **cerrar** la OS: descuenta inventario, registra el cobro en caja, congela el desglose contable.

## 3. Ciclos mensuales

- Nueva pantalla `/periods` (o sección en Dashboard): lista de períodos, botón "Cerrar mes actual y abrir el siguiente".
- Selector de período activo en el header (default: mes en curso).
- Al cerrar mes: marca período `closed`, guarda `snapshot` con totales calculados (para que el histórico no cambie aunque se editen registros viejos).
- Dashboard, Reportes y Caja se filtran por período seleccionado.

## 4. Dashboard rediseñado

KPIs del período activo:

- Caja esperada (ventas cobradas − gastos − compras externas − pagos a mecánicos)
- Ganancia total del taller
- Desglose de ganancias: **Bebidas / Repuestos taller / Repuestos externos / Mano de obra (parte taller)**
- Por pagar a mecánicos (acumulado − ya pagado)
- Gastos del mes
- OS abiertas vs cerradas

Gráficos: ganancias por categoría (pie), ventas diarias del mes (line).

## 5. Pantalla "Mecánicos" (`/mechanics`)

- CRUD de mecánicos.
- Por cada mecánico, en el período activo: total devengado, total pagado, saldo pendiente.
- Botón "Registrar pago" → crea `mechanicPayout` y descuenta caja.
- Detalle: lista de OS / ítems donde participó.

## 6. Pantalla "Gastos" (`/expenses`)

- CRUD de gastos del mes con categorías (arriendo, servicios, compras, otro).
- Descuenta caja automáticamente.
- Total mensual visible.

## 7. Caja simplificada

Refactor de `/cash`: el saldo esperado se calcula desde los movimientos del período (ventas OS + compras externas + gastos + pagos a mecánicos), no desde sesiones abrir/cerrar (se mantienen sesiones pero opcionales para arqueos).

## 8. Reportes / Excel (`/reports`)

Export por período, varias hojas en un solo `.xlsx`:

1. Resumen del mes (KPIs)
2. Órdenes de servicio (una fila por OS)
3. Ítems de OS (detalle desglosado)
4. Ganancias por categoría
5. Mecánicos (devengado / pagado / saldo)
6. Gastos
7. Repuestos externos
8. Inventario (stock actual)

## 9. Cambios de navegación

Sidebar/bottom-nav reordenado:

```
Dashboard · POS · Órdenes · Inventario · Servicios · Clientes
Mecánicos · Gastos · Caja · Reportes · Períodos · Ajustes · Backups
```

POS se mantiene para venta rápida de bebidas/repuestos sueltos (genera OS-flash).

## Detalles técnicos

- Migración Dexie: bump `db.version()`, añadir tablas nuevas, transformar `workOrders` y `services` existentes (mock seed se regenera con la nueva forma).
- Helpers nuevos: `src/lib/period.ts` (current key, formatters), `src/lib/accounting.ts` (cálculo de KPIs y desglose por período).
- Hook `usePeriod()` con Zustand para período activo global.
- Tipos TS estrictos en items de OS (`discriminated union` por `kind`).
- Todo sigue corriendo 100% en IndexedDB; sin backend.

## Lo que NO cambia

- Stack (TanStack Start, Dexie, shadcn, Zustand, Recharts, xlsx).
- Diseño visual oscuro/industrial existente.
- Backups JSON export/import (se adapta al nuevo esquema).
