# Magno Marbella · Plataforma de control financiero

Aplicación web para la gestión financiera y operativa de **Magno Marbella (Entrenos Sports
Services)**: control de ingresos, costes de proveedores y colaboradores, márgenes, impuestos y
seguimiento por jugador y temporada, con edición directa de todos los registros.

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # compilación de producción en dist/
npm run preview    # sirve dist/ localmente
npm run typecheck  # comprobación de tipos
```

La aplicación es 100 % cliente: no necesita servidor ni base de datos. Los datos viven en el
`localStorage` del navegador y se pueden exportar e importar como JSON desde **Ajustes**.

## Módulos

| Sección | Contenido |
| --- | --- |
| **Dashboard** | KPIs de la temporada, ranking de jugadores, desglose de gasto por proveedor, análisis de oportunidades y fugas de margen, evolución mensual y cuenta de resultados. |
| **Operaciones** | Tabla CRUD con edición *inline* (fecha, jugador, ubicación, importe cobrado) y ficha completa con el desglose de servicios, venta, cobro y coste. Búsqueda, ordenación, duplicado y exportación a CSV. |
| **Jugadores** | Rentabilidad por cliente: facturación frente a margen, dispersión volumen/rentabilidad y detalle con peso sobre la facturación y estado de cobro. |
| **Proveedores** | Alta y edición de instalaciones y colaboradores, coste imputado desde las operaciones y registro de liquidaciones pagadas y pendientes. |
| **Ajustes** | Parámetros fiscales por temporada (impuesto, IVA, fee), creación de nuevas temporadas, catálogo de ubicaciones, conciliación con el control operativo y copia de seguridad. |

Un **filtro global de temporada** (2025 / 2026 / todas / las que se creen) afecta a todas las
secciones a la vez.

## Modelo de cálculo

Cada operación se compone de líneas de servicio —chef/villa, campo, coach, gimnasio y fisio— con
una cantidad, una tarifa de venta al cliente y una tarifa de coste del proveedor:

```
Subtotal venta   = Σ (cantidad × tarifa cliente)
Fee de servicio  = Subtotal venta × fee %            (20 % por defecto)
Base imponible   = Subtotal venta + Fee
IVA repercutido  = Base imponible × IVA %            (21 % por defecto)
Total venta      = Base imponible + IVA

Base de coste    = Σ (cantidad × tarifa proveedor)
IVA soportado    = Base de coste × IVA %
Total coste      = Base de coste + IVA soportado

Beneficio operativo = Total venta − Total coste
```

Y a nivel de temporada:

```
Margen bruto            = Total facturado − Total costes de proveedores
Impuesto de sociedades  = Margen bruto × tipo de la temporada   (22 % en 2025, 25 % en 2026)
Beneficio neto real     = Margen bruto − Impuesto de sociedades
```

El fee, el IVA de venta y el IVA soportado son editables operación a operación (por ejemplo, un
cliente no residente se factura sin IVA repercutido), y el tipo impositivo es editable por
temporada tanto desde el dashboard como desde Ajustes. Con el filtro en «todas las temporadas»
el impuesto se calcula temporada a temporada con su propio tipo y solo sobre márgenes positivos.

## Datos iniciales

La aplicación arranca con las temporadas 2025 y 2026 del control operativo real: 15 operaciones,
9 proveedores y 12 liquidaciones.

El control de origen está cerrado **por jugador** (total facturado y total de coste), no por línea
de servicio. Cada operación se reconstruye repartiendo esos totales entre los servicios realmente
prestados, de modo que el total de venta reproduce el facturado declarado y el total de coste
reproduce el gasto declarado, dejando las tarifas unitarias editables. El redondeo de las tarifas
a dos decimales introduce una desviación inferior a 1 € por temporada, visible en
**Ajustes → Conciliación**.

Dos registros agregados (`Varios (operaciones menores)`, uno por temporada) cuadran la diferencia
entre la suma de los jugadores detallados en el control y el total de cada temporada. Conviene
desglosarlos a medida que se recuperen las facturas individuales.

### Revisión del impuesto declarado

En el control operativo de origen, el impuesto de sociedades y el beneficio neto de **ambas
temporadas** están calculados sobre el *total de gastos de proveedores* en lugar de sobre el margen
bruto:

| Temporada | Gastos proveedores | Impuesto declarado | Comprobación | Beneficio neto declarado | Comprobación |
| --- | --- | --- | --- | --- | --- |
| 2025 | 40.957,42 € | 9.010,63 € | = 40.957,42 × 22 % | 31.946,79 € | = 40.957,42 − 9.010,63 |
| 2026 | 22.300,00 € | 5.575,00 € | = 22.300,00 × 25 % | 16.725,00 € | = 22.300,00 − 5.575,00 |

La plataforma aplica la fórmula correcta (`impuesto = margen bruto × tipo`), por lo que sus cifras
de impuesto y beneficio neto difieren a propósito de las declaradas. La diferencia y su explicación
aparecen en **Ajustes → Conciliación con el control operativo**. Conviene revisar el control de
origen antes de usarlo para la declaración.

## Arquitectura

```
src/
  types.ts               Modelo de dominio (operaciones, proveedores, temporadas)
  lib/calc.ts            Motor de cálculo y agregaciones (jugador, servicio, proveedor, mes)
  lib/format.ts          Formato en es-ES: euros, porcentajes, fechas y lectura de números
  lib/storage.ts         Persistencia en localStorage, normalización e importación/exportación
  data/seed.ts           Datos reales de las temporadas 2025 y 2026
  store/store.tsx        Estado global, filtro de temporada y operaciones CRUD
  components/            Primitivas de interfaz, tarjetas KPI y utilidades de gráficos
  pages/                 Dashboard, Operaciones, Jugadores, Proveedores y Ajustes
```

Stack: React 18, TypeScript, Vite, Tailwind CSS 4 y Recharts. El estado importado o recuperado de
`localStorage` se normaliza contra el modelo actual, de modo que un JSON antiguo o incompleto no
rompe la aplicación.
