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

### Descuento

Cada operación admite un descuento en euros sobre el total de servicios, antes de IVA, igual que la
columna `Descuento` de la hoja. Se reparte entre las líneas en proporción a su importe, de modo que
cada una conserva su propio tipo de IVA y la suma cuadra al céntimo.

### Fee de servicio

La hoja de control no tiene fee: el margen sale del diferencial entre el precio de cliente y el coste
de proveedor. Por eso las operaciones nuevas y la temporada 2027 arrancan con el fee a **0**.

Las temporadas 2025 y 2026 lo mantienen al 20 % porque sus operaciones se reconstruyeron con él para
cuadrar los totales declarados en el control de origen; se cambia desde Ajustes si hace falta.

Y a nivel de temporada:

```
Margen bruto            = Total facturado − Total costes de proveedores
Impuesto de sociedades  = Margen bruto × tipo de la temporada   (22 % en 2025, 25 % en 2026)
Beneficio neto real     = Margen bruto − Impuesto de sociedades
```

Con el filtro en «todas las temporadas» el impuesto se calcula temporada a temporada con su propio
tipo y solo sobre márgenes positivos.

## Importar la hoja «MAGNO ENTRENOS»

El control del día a día vive en la hoja de cálculo *CONTROL BUSSINES*, pestaña **MAGNO ENTRENOS**.
Desde **Ajustes → Importar la hoja** se pegan sus filas, con la de cabecera, y se convierten en
operaciones. El importador localiza las columnas por el nombre de la cabecera, no por su posición,
así que la hoja puede crecer o moverse sin romper la importación.

Cómo lee la hoja:

| En la hoja | En la aplicación |
| --- | --- |
| `Fecha` (texto libre: «29,30 mayo - 1,2,3 junio») | fecha de la operación, tomando el primer día y mes; el texto completo queda en las notas |
| `Lugar`, `Nombre` | ubicación y jugador |
| `Cheff o Fisio o Villa`, `Campo`, `Entrenador`, `Gimnasio` + su `Hora` | línea de servicio con su cantidad y precio de cliente |
| Segunda aparición de `Cheff`, `Fisio`, `Campo`, `Entrenador`, `Gimnasio` | coste de proveedor de esa misma línea |
| `Descuento` | descuento de la operación |
| `Pagado` | importe cobrado |

Nada se guarda hasta confirmar: primero se muestra una vista previa con el total de cliente, el coste
y el beneficio de cada fila, para cotejarlos con la hoja antes de importar.

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

### Qué dice cada fuente sobre 2026

Hay tres cifras de facturación para la temporada 2026 y no miden lo mismo:

| Fuente | Base sin IVA | Con IVA | Qué cubre |
| --- | --- | --- | --- |
| Hoja CONTROL BUSSINES · MAGNO ENTRENOS | 110.919,00 € | 131.218,86 € | las 36 operaciones del año, hasta diciembre |
| Libro de IVA de la sociedad | 42.385,60 € | 51.181,57 € | solo la serie MM de abril a agosto |
| JSON del control operativo inicial | — | 44.704,00 € | resumen de partida, ya superado |

La suma de la columna *Base* de la hoja cuadra al céntimo con los 110.919,00 € que declara el
negocio, y diez de sus filas coinciden exactamente con facturas del libro de IVA (MM/000001 con
Monchu, MM/000004 con Tyler, MM/000009 con Alvian…), así que las dos fuentes se validan entre sí.
El desfase de 68.533,40 € es lo que la hoja recoge y el libro cargado no: de septiembre a diciembre
—incluida una operación de 56.000 € de base entre octubre y diciembre— más las filas cobradas sin
IVA. La sección **Temporada** muestra esta conciliación y cuánto falta por cargar.

De las 36 filas de la hoja, **18 se cobraron sin IVA** (14.253,00 € de base): son los cobros en
efectivo, que la aplicación modela con el IVA por línea.

### Libros de facturación 2026

La temporada 2026 arranca con los libros de IVA reales de abril a agosto de 2026: **19 facturas
emitidas** (51.181,57 €) y **100 recibidas** (27.072,39 € de gasto directo más 6.602,03 € de gastos
compartidos con la agencia). De ahí salen también las fichas de cliente, con sus nombres y CIF reales.

Siete facturas de profesionales autónomos llevan **retención de IRPF** (15 %, y una al 7 %), 475,80 €
en total: ese importe no se le paga al proveedor, se ingresa en Hacienda, y la aplicación lo descuenta
del importe a pagar y lo muestra en su propio indicador.

### Tarifario

Los precios salen de la hoja de control de 2026:

| Servicio | Precio cliente | Coste proveedor | Margen |
| --- | --- | --- | --- |
| Campo · Marbella Football Center | 480 € | 350 € | 130 € (27 %) |
| Campo · Banus FC | 360 € | 250 € | 110 € (31 %) |
| Campo · Estepona Football Center | 360 € | 250 € | 110 € (31 %) |
| Entrenador | 110 € | 50 € | 60 € (55 %) |
| Gimnasio | 95 € | 60 € | 35 € (37 %) |
| Fisio | 70 € | 50 € | 20 € (29 %) |
| Chef | 180 € | 120 € | 60 € (33 %) |

En la hoja aparecen variantes —el entrenador también a 108 € de venta y 70 € de coste, el gimnasio a
90, 85 y 80 €— que conviene revisar. La villa y el hotel se facturan por importe cerrado, no por
tarifa, así que su línea queda inactiva.

El margen por unidad es `precio cliente × (1 + fee) − coste de proveedor`. El IVA no entra: se
repercute y se soporta al mismo tipo, así que no altera el margen.

La sección Tarifas marca automáticamente cualquier tarifa que se venda por debajo del coste del
proveedor.

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
