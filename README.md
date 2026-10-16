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
| **Operaciones** | Tabla CRUD con edición *inline* (fecha, jugador, ubicación, importe cobrado) y ficha completa: líneas de servicio con nombre libre, precio al cliente, coste de proveedor e IVA por línea, más el desglose de lo que hay que pagar a cada proveedor. Búsqueda, ordenación, duplicado y exportación a CSV. |
| **Jugadores** | Rentabilidad por cliente: facturación frente a margen, dispersión volumen/rentabilidad y detalle con peso sobre la facturación y estado de cobro. Incluye el registro de **fichas de cliente** (jugador, agencia, club, contacto), independiente de la temporada. |
| **Proveedores** | Alta y edición de instalaciones y colaboradores, coste imputado desde las operaciones y registro de liquidaciones pagadas y pendientes. |
| **Facturación** | Libros de IVA repercutido y soportado, editables en la propia tabla como una hoja de cálculo: fecha, nº, cliente o proveedor, CIF, base, IVA, retención de IRPF, estado de cobro y de pago. Marca de gasto compartido con la agencia, desglose por categoría y exportación a CSV. |
| **Tarifas** | Tarifario por temporada: precio de venta al cliente y coste de proveedor de cada servicio, con el margen por unidad y aviso de las tarifas que se venden por debajo de coste. Se copia de una temporada a otra en un clic. |
| **Ajustes** | Parámetros fiscales por temporada (impuesto, IVA, fee), creación de nuevas temporadas, catálogo de ubicaciones, conciliación con el control operativo y copia de seguridad. |

Un **filtro global de temporada** (2025 / 2026 / todas / las que se creen) afecta a todas las
secciones a la vez.

## Modelo de cálculo

Cada operación se compone de **líneas de servicio con nombre libre**. En cada línea se indica la
cantidad, el precio por unidad que se le cobra al cliente y el coste por unidad del proveedor:

```
Base venta      = cantidad × precio cliente
Fee de servicio = Base venta × fee %              (20 % por defecto)
Base imponible  = Base venta + Fee
IVA repercutido = Base imponible × IVA venta %    (0 si se cobra sin IVA)
Total cliente   = Base imponible + IVA

Base coste      = cantidad × coste proveedor
IVA soportado   = Base coste × IVA coste %        (0 si el proveedor no repercute IVA)
Total proveedor = Base coste + IVA soportado

Beneficio       = Total cliente − Total proveedor
```

Los totales de la operación son la suma de sus líneas. El IVA se calcula **línea a línea**, que es
lo que permite que cada servicio lleve su propio tipo; frente a calcularlo sobre la base agregada
puede haber una diferencia de céntimos por redondeo.

### El IVA va por línea

Cada línea elige su tipo de IVA de venta —21 %, 10 % o sin IVA— porque depende de cómo paga el
cliente: **por transferencia se repercute, en efectivo no**. El selector *Forma de cobro* de la
cabecera cambia el IVA de todas las líneas de golpe, y luego cada una se puede ajustar por
separado; si quedan mezcladas, la operación lo avisa.

El IVA soportado es independiente: lo fija la factura del proveedor, no la forma en que cobra el
cliente. Una instalación factura con IVA aunque al cliente se le cobre en efectivo, y esa asimetría
queda reflejada en el beneficio.

### Fee de servicio

El precio que se teclea es el que se le da al cliente **antes** del fee del 20 %, que se suma
encima según el modelo de negocio original. La columna *Total cliente* de cada línea muestra el
importe final ya con fee e IVA, así que no hay ambigüedad sobre lo que se factura. Si el precio
acordado con el cliente ya es el final, basta con poner el fee a 0 en la operación (o en la
temporada, desde Ajustes).

Y a nivel de temporada:

```
Margen bruto            = Total facturado − Total costes de proveedores
Impuesto de sociedades  = Margen bruto × tipo de la temporada   (22 % en 2025, 25 % en 2026)
Beneficio neto real     = Margen bruto − Impuesto de sociedades
```

Con el filtro en «todas las temporadas» el impuesto se calcula temporada a temporada con su propio
tipo y solo sobre márgenes positivos.

## Preparar una temporada nueva

1. **Ajustes** → crear la temporada y fijar su tipo impositivo, IVA y fee.
2. **Tarifas** → con la temporada seleccionada en el filtro global, *Copiar tarifas de…* la
   temporada anterior y revisar precio de venta y coste de cada servicio. Una tarifa sin precio
   de venta queda inactiva y no se ofrece hasta fijarlo.
3. **Jugadores** → *Nuevo cliente* para cada jugador o agencia que entre.
4. **Operaciones** → *Nueva operación*: se elige el cliente y se van añadiendo servicios, desde el
   tarifario (rellena nombre, precio, coste y proveedor de golpe) o a mano con *Servicio manual*.
   Todo sigue siendo editable línea a línea.

Una operación creada en una temporada distinta del año en curso nace con fecha 1 de enero de esa
temporada, para no quedar fuera de su propio ejercicio.

## La sociedad y sus dos actividades

Magno Marbella no es una sociedad independiente: es una de las dos actividades de una misma sociedad,
junto con SCM Sports Agency. Eso tiene tres consecuencias que la aplicación refleja:

- **Las facturas se separan por serie.** Las de la serie `MM/` son de Magno. Quedan fuera las de la
  serie `SCM/` y la factura `MM/000017` a HNK Gorica por 200.000 €, que se numeró como MM siendo una
  comisión de representación de la agencia.
- **Los gastos compartidos se reparten.** Combustible, vuelos y comidas sirven a las dos actividades:
  se marcan como compartidos y solo se imputa a Magno el porcentaje configurado (50 % por defecto,
  editable desde Facturación).
- **El IVA y el impuesto de sociedades se liquidan juntos** para toda la sociedad. El impuesto que
  calcula el dashboard es el que le correspondería a Magno por su propio margen: mide la rentabilidad
  de la actividad, no es la cuota a ingresar.

## Datos iniciales

La aplicación arranca con las temporadas 2025 y 2026 del control operativo real: 15 operaciones,
9 proveedores y 12 liquidaciones. Se incluye además la temporada **2027** vacía de operaciones,
con su tarifario listo para revisar, y las fichas de los clientes que ya aparecen en el histórico.

### Libros de facturación 2026

La temporada 2026 arranca con los libros de IVA reales de abril a agosto de 2026: **19 facturas
emitidas** (51.181,57 €) y **100 recibidas** (27.072,39 € de gasto directo más 6.602,03 € de gastos
compartidos con la agencia). De ahí salen también las fichas de cliente, con sus nombres y CIF reales.

Siete facturas de profesionales autónomos llevan **retención de IRPF** (15 %, y una al 7 %), 475,80 €
en total: ese importe no se le paga al proveedor, se ingresa en Hacienda, y la aplicación lo descuenta
del importe a pagar y lo muestra en su propio indicador.

### Tarifario de partida

No consta ninguna lista de precios en el control de origen, así que las tarifas se han calculado
como la **media efectiva por servicio y proveedor** de las operaciones reales de cada temporada.
Las de 2027 arrancan con esos valores y llevan el aviso «revisar antes de facturar» en sus notas.

| Servicio | Proveedor | Precio cliente | Coste | Margen/unidad | Origen |
| --- | --- | --- | --- | --- | --- |
| Campo | Marbella Football Center | 82,57 € | 54,38 € | 44,70 € (45 %) | media 2026 |
| Campo | Banus FC | 72,85 € | 75,00 € | 12,42 € (14 %) | media 2026 |
| Campo | Dama de Noche | 86,19 € | 50,49 € | 52,94 € (51 %) | media 2025 |
| Campo | Estepona Sports Complex | — | 75,00 € | — | inactiva, sin precio de venta |
| Coach | Staff de Entrenadores Magno | 67,09 € | 24,72 € | 55,79 € (69 %) | media 2026 |
| Chef | Villas & Hoteles Marbella | 117,26 € | 109,20 € | 31,51 € (22 %) | media 2026 |
| Chef | Chef Privado Marbella | 178,33 € | 93,02 € | 120,98 € (57 %) | media 2025 |
| Fisio | Fisioterapia Deportiva Marbella | 52,44 € | 23,97 € | 38,96 € (62 %) | media 2026 |
| Gimnasio | Gimnasio High Performance | 62,66 € | 8,92 € | 66,27 € (88 %) | media 2026 |

El margen por unidad es `precio cliente × (1 + fee) − coste de proveedor`. El IVA no entra: se
repercute y se soporta al mismo tipo, así que no altera el margen.

**Campo · Banus FC se vende por debajo de coste**: 72,85 € frente a 75,00 € que se pagan a la
instalación. Solo el fee del 20 % mantiene la operación en positivo, y aun así deja un 14 % frente
al 45 % de MFC. La sección Tarifas marca automáticamente cualquier tarifa en esta situación.

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
  types.ts               Modelo de dominio (operaciones, clientes, tarifas, proveedores, temporadas)
  lib/calc.ts            Motor de cálculo y agregaciones (jugador, servicio, proveedor, mes)
  lib/format.ts          Formato en es-ES: euros, porcentajes, fechas y lectura de números
  lib/storage.ts         Persistencia en localStorage, normalización e importación/exportación
  data/seed.ts           Datos reales de las temporadas 2025 y 2026
  lib/descarga.ts        Descarga de CSV y JSON, con soporte del visor de Artifacts
  store/store.tsx        Estado global, filtro de temporada y operaciones CRUD
  components/            Primitivas de interfaz, tarjetas KPI, ficha de cliente y gráficos
  pages/                 Dashboard, Operaciones, Jugadores, Proveedores, Tarifas y Ajustes
```

Stack: React 18, TypeScript, Vite, Tailwind CSS 4 y Recharts. El estado importado o recuperado de
`localStorage` se normaliza contra el modelo actual, de modo que un JSON antiguo o incompleto no
rompe la aplicación. Las migraciones automáticas son dos: si faltan las fichas de cliente se
reconstruyen a partir de los jugadores de las operaciones guardadas, y las operaciones del modelo
antiguo —cinco servicios fijos con el IVA a nivel de operación— se convierten en líneas libres
conservando sus importes.

La exportación a CSV saca **una fila por línea de servicio**, con los datos de la operación
repetidos, que es el formato que sirve tanto para cuadrar pagos a proveedores como para pivotar en
una hoja de cálculo.
