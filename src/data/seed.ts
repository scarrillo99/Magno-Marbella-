import {
  SERVICIO_LABEL,
  type AppState,
  type LineaServicio,
  type Operacion,
  type ServicioKey,
} from '../types'
import { CATEGORIAS_DIRECTAS_POR_DEFECTO, r2 } from '../lib/calc'
import { CATEGORIAS_GASTO, FACTURAS_EMITIDAS, FACTURAS_RECIBIDAS } from './facturas2026'
import { operaciones2026 } from './magnoEntrenos2026'

/* -------------------------------------------------------------------------
 * Datos reales del control operativo de Magno Marbella (temporadas 2025-2026).
 *
 * El control de origen esta cerrado por jugador (total facturado / total coste),
 * no por línea de servicio. Aqui se reconstruye cada operación repartiendo esos
 * totales entre los servicios realmente prestados, de forma que:
 *
 *   - el total de venta de cada operación reproduce el facturado declarado,
 *   - el total de coste reproduce el gasto de proveedores declarado,
 *   - y las tarifas unitarias quedan editables desde la aplicación.
 *
 * Las tarifas se redondean a 2 decimales, por lo que puede aparecer una
 * desviacion de centimos frente a la cifra oficial. Ajustes > Conciliación
 * muestra esa diferencia de forma explicita.
 * ---------------------------------------------------------------------- */

const PROVEEDORES: AppState['proveedores'] = [
  { id: 'prov_mfc', nombre: 'Marbella Football Center (MFC)', tipo: 'instalacion', contacto: 'reservas@marbellafootballcenter.com', tarifaHabitual: 85, cif: 'B92xxxxx1', notas: 'Campo 11 y campo 7. Facturación mensual.', activo: true },
  { id: 'prov_banus', nombre: 'Banus FC', tipo: 'instalacion', contacto: 'operaciones@banusfc.com', tarifaHabitual: 95, cif: 'B92xxxxx2', notas: 'Instalación principal temporada 2026.', activo: true },
  { id: 'prov_dama', nombre: 'Dama de Noche', tipo: 'instalacion', contacto: 'info@damadenoche.es', tarifaHabitual: 90, cif: 'B29xxxxx3', notas: 'Campo y zona de calentamiento.', activo: true },
  { id: 'prov_estepona', nombre: 'Estepona Sports Complex', tipo: 'instalacion', contacto: 'reservas@esteponasports.es', tarifaHabitual: 75, cif: 'B29xxxxx4', notas: 'Alternativa en alta ocupacion.', activo: true },
  { id: 'prov_coach', nombre: 'Staff de Entrenadores Magno', tipo: 'coach', contacto: 'coaches@magnomarbella.com', tarifaHabitual: 60, cif: '—', notas: 'Colaboradores por horas, liquidación quincenal.', activo: true },
  { id: 'prov_chef', nombre: 'Chef Privado Marbella', tipo: 'chef', contacto: 'chef@privatechefmarbella.com', tarifaHabitual: 180, cif: 'B29xxxxx5', notas: 'Servicio de chef a domicilio, tarifa por dia.', activo: true },
  { id: 'prov_alojamiento', nombre: 'Villas & Hoteles Marbella', tipo: 'chef', contacto: 'bookings@villasmarbella.com', tarifaHabitual: 320, cif: 'B29xxxxx6', notas: 'Villa, hotel y servicio de chef incluido.', activo: true },
  { id: 'prov_fisio', nombre: 'Fisioterapia Deportiva Marbella', tipo: 'fisio', contacto: 'clinica@fisiomarbella.es', tarifaHabitual: 55, cif: 'B29xxxxx7', notas: 'Sesiones de recuperacion y readaptacion.', activo: true },
  { id: 'prov_gym', nombre: 'Gimnasio High Performance', tipo: 'gimnasio', contacto: 'info@hpgym.es', tarifaHabitual: 35, cif: 'B29xxxxx8', notas: 'Acceso y preparador fisico.', activo: true },
]

const UBICACIONES = [
  'Banus FC',
  'Marbella Football Center',
  'Estepona Football Center',
  'Dama de Noche',
  'Villa + Hotel',
  'Villa Lanzini',
  'Chef Villa',
]

interface MixLinea {
  cantidad: number
  /** Peso del servicio sobre el subtotal de venta de la operación. */
  venta: number
  /** Peso del servicio sobre la base de coste de la operación. */
  coste: number
  proveedorId: string
}

interface DefOperacion {
  id: string
  factura: string
  fecha: string
  temporada: number
  ubicacion: string
  jugador: string
  /** Total facturado al cliente, con fee e IVA incluidos. */
  totalVenta: number
  /** Total pagado a proveedores, con IVA incluido. */
  totalCoste: number
  feePct?: number
  ivaVentaPct?: number
  ivaCostePct?: number
  /** Importe cobrado. `null` = cobrado integramente. */
  pagado?: number | null
  notas?: string
  mix: Partial<Record<ServicioKey, MixLinea>>
}

/** Reparte los totales declarados entre las líneas de servicio de la operación. */
function construir(def: DefOperacion): Operacion {
  const feePct = def.feePct ?? 0.2
  const ivaVentaPct = def.ivaVentaPct ?? 0.21
  const ivaCostePct = def.ivaCostePct ?? 0.21

  const subtotalVentaObjetivo = def.totalVenta / ((1 + feePct) * (1 + ivaVentaPct))
  const baseCosteObjetivo = def.totalCoste / (1 + ivaCostePct)

  const entradas = Object.entries(def.mix) as [ServicioKey, MixLinea][]
  const sumaVenta = entradas.reduce((a, [, m]) => a + m.venta, 0) || 1
  const sumaCoste = entradas.reduce((a, [, m]) => a + m.coste, 0) || 1

  const lineas: LineaServicio[] = entradas.map(([key, m]) => {
    const ventaLinea = (subtotalVentaObjetivo * m.venta) / sumaVenta
    const costeLinea = (baseCosteObjetivo * m.coste) / sumaCoste
    return {
      id: `${def.id}_${key}`,
      nombre: SERVICIO_LABEL[key],
      cantidad: m.cantidad,
      tarifaVenta: m.cantidad > 0 ? r2(ventaLinea / m.cantidad) : 0,
      tarifaCoste: m.cantidad > 0 ? r2(costeLinea / m.cantidad) : 0,
      proveedorId: m.proveedorId,
      proveedorNombre: PROVEEDORES.find((p) => p.id === m.proveedorId)?.nombre ?? '',
      ivaVentaPct,
      ivaCostePct,
    }
  })

  const totalVentaReal = r2(
    lineas.reduce((a, l) => {
      const base = r2(l.cantidad * l.tarifaVenta)
      return a + r2(r2(base + r2(base * feePct)) * (1 + ivaVentaPct))
    }, 0),
  )

  return {
    id: def.id,
    numeroFactura: def.factura,
    fecha: def.fecha,
    temporada: def.temporada,
    ubicacion: def.ubicacion,
    jugador: def.jugador,
    lineas,
    feePct,
    descuento: 0,
    pagosProveedor: {},
    pagado: def.pagado === undefined || def.pagado === null ? totalVentaReal : def.pagado,
    notas: def.notas ?? '',
  }
}

const DEFINICIONES: DefOperacion[] = [
  /* ------------------------------ Temporada 2025 ------------------------------ */
  {
    id: 'op_2025_rogon',
    factura: 'MM-2025-001',
    fecha: '2025-06-02',
    temporada: 2025,
    ubicacion: 'Dama de Noche',
    jugador: 'Rogon',
    totalVenta: 44390.06,
    totalCoste: 18759.59,
    pagado: 40000,
    notas: 'Pretemporada completa de la agencia Rogon: bloque de 8 semanas con chef, villa y staff dedicado.',
    mix: {
      chef: { cantidad: 60, venta: 0.35, coste: 0.36, proveedorId: 'prov_chef' },
      campo: { cantidad: 90, venta: 0.28, coste: 0.3, proveedorId: 'prov_dama' },
      coach: { cantidad: 90, venta: 0.25, coste: 0.22, proveedorId: 'prov_coach' },
      gimnasio: { cantidad: 40, venta: 0.06, coste: 0.06, proveedorId: 'prov_gym' },
      fisio: { cantidad: 25, venta: 0.06, coste: 0.06, proveedorId: 'prov_fisio' },
    },
  },
  {
    id: 'op_2025_sunett',
    factura: 'MM-2025-002',
    fecha: '2025-06-18',
    temporada: 2025,
    ubicacion: 'Marbella Football Center',
    jugador: 'Sunett',
    totalVenta: 12175.73,
    totalCoste: 3250.83,
    pagado: 10000,
    notas: 'Bloque individual de tecnificación, tarifa premium de coach.',
    mix: {
      campo: { cantidad: 45, venta: 0.4, coste: 0.74, proveedorId: 'prov_mfc' },
      coach: { cantidad: 45, venta: 0.4, coste: 0.2, proveedorId: 'prov_coach' },
      gimnasio: { cantidad: 20, venta: 0.1, coste: 0.03, proveedorId: 'prov_gym' },
      fisio: { cantidad: 10, venta: 0.1, coste: 0.03, proveedorId: 'prov_fisio' },
    },
  },
  {
    id: 'op_2025_rasford',
    factura: 'MM-2025-003',
    fecha: '2025-07-01',
    temporada: 2025,
    ubicacion: 'Marbella Football Center',
    jugador: 'Rasford',
    totalVenta: 6229.08,
    totalCoste: 3932.5,
    notas: 'Programa de 40 horas de campo con trabajo de fuerza complementario.',
    mix: {
      campo: { cantidad: 40, venta: 0.5, coste: 0.74, proveedorId: 'prov_mfc' },
      coach: { cantidad: 40, venta: 0.38, coste: 0.2, proveedorId: 'prov_coach' },
      gimnasio: { cantidad: 12, venta: 0.12, coste: 0.06, proveedorId: 'prov_gym' },
    },
  },
  {
    id: 'op_2025_orel',
    factura: 'MM-2025-004',
    fecha: '2025-07-10',
    temporada: 2025,
    ubicacion: 'Dama de Noche',
    jugador: 'Orel Greuel',
    totalVenta: 5111.04,
    totalCoste: 2528.9,
    notas: 'Bloque de 24 horas con fisioterapia de recuperacion.',
    mix: {
      campo: { cantidad: 24, venta: 0.45, coste: 0.5, proveedorId: 'prov_dama' },
      coach: { cantidad: 24, venta: 0.4, coste: 0.35, proveedorId: 'prov_coach' },
      fisio: { cantidad: 6, venta: 0.15, coste: 0.15, proveedorId: 'prov_fisio' },
    },
  },
  {
    id: 'op_2025_curtis',
    factura: 'MM-2025-005',
    fecha: '2025-07-22',
    temporada: 2025,
    ubicacion: 'Marbella Football Center',
    jugador: 'Curtis',
    totalVenta: 3194.4,
    totalCoste: 2420,
    notas: 'Margen ajustado: tarifa de campo en temporada alta.',
    mix: {
      campo: { cantidad: 20, venta: 0.55, coste: 0.74, proveedorId: 'prov_mfc' },
      coach: { cantidad: 20, venta: 0.45, coste: 0.26, proveedorId: 'prov_coach' },
    },
  },
  {
    id: 'op_2025_tyler',
    factura: 'MM-2025-006',
    fecha: '2025-08-04',
    temporada: 2025,
    ubicacion: 'Dama de Noche',
    jugador: 'Tyler',
    totalVenta: 2960,
    totalCoste: 2129.6,
    ivaVentaPct: 0,
    notas: 'Cliente no residente: operación facturada sin IVA repercutido.',
    mix: {
      campo: { cantidad: 18, venta: 0.5, coste: 0.55, proveedorId: 'prov_dama' },
      coach: { cantidad: 18, venta: 0.5, coste: 0.45, proveedorId: 'prov_coach' },
    },
  },
  {
    id: 'op_2025_jerry',
    factura: 'MM-2025-007',
    fecha: '2025-08-19',
    temporada: 2025,
    ubicacion: 'Marbella Football Center',
    jugador: 'Jerry Yates',
    totalVenta: 2787.84,
    totalCoste: 1936,
    notas: 'Bloque corto de 16 horas antes de incorporacion a club.',
    mix: {
      campo: { cantidad: 16, venta: 0.55, coste: 0.74, proveedorId: 'prov_mfc' },
      coach: { cantidad: 16, venta: 0.35, coste: 0.2, proveedorId: 'prov_coach' },
      fisio: { cantidad: 4, venta: 0.1, coste: 0.06, proveedorId: 'prov_fisio' },
    },
  },
  {
    id: 'op_2025_varios',
    factura: 'MM-2025-008',
    fecha: '2025-09-15',
    temporada: 2025,
    ubicacion: 'Marbella Football Center',
    jugador: 'Varios (operaciones menores)',
    totalVenta: 20000,
    totalCoste: 6000,
    notas: 'Registro agregado que cierra la temporada 2025 contra el control operativo. Desglosar según se recuperen las facturas individuales.',
    mix: {
      campo: { cantidad: 60, venta: 0.4, coste: 0.5, proveedorId: 'prov_mfc' },
      coach: { cantidad: 60, venta: 0.45, coste: 0.4, proveedorId: 'prov_coach' },
      gimnasio: { cantidad: 30, venta: 0.15, coste: 0.1, proveedorId: 'prov_gym' },
    },
  },

]

const LIQUIDACIONES: AppState['liquidaciones'] = [
  { id: 'liq_1', proveedorId: 'prov_mfc', fecha: '2025-07-31', temporada: 2025, concepto: 'Alquiler de campo julio 2025', importe: 3450.0, estado: 'pagada' },
  { id: 'liq_2', proveedorId: 'prov_mfc', fecha: '2025-09-30', temporada: 2025, concepto: 'Alquiler de campo agosto-septiembre 2025', importe: 5066.3, estado: 'pagada' },
  { id: 'liq_3', proveedorId: 'prov_dama', fecha: '2025-08-31', temporada: 2025, concepto: 'Campo y zona de calentamiento verano 2025', importe: 6120.0, estado: 'pagada' },
  { id: 'liq_4', proveedorId: 'prov_coach', fecha: '2025-09-15', temporada: 2025, concepto: 'Liquidación staff de entrenadores Q3 2025', importe: 4880.0, estado: 'pagada' },
  { id: 'liq_5', proveedorId: 'prov_chef', fecha: '2025-08-10', temporada: 2025, concepto: 'Servicio de chef bloque Rogon', importe: 5580.0, estado: 'pagada' },
  { id: 'liq_6', proveedorId: 'prov_fisio', fecha: '2025-10-05', temporada: 2025, concepto: 'Sesiones de fisioterapia temporada 2025', importe: 1240.0, estado: 'pendiente' },
  { id: 'liq_7', proveedorId: 'prov_gym', fecha: '2025-10-05', temporada: 2025, concepto: 'Accesos y preparador fisico 2025', importe: 980.0, estado: 'pendiente' },
]

/* ---------------------------------------------------------------------------
 * Fichas de cliente. Se parte de los jugadores que ya aparecen en las
 * temporadas 2025 y 2026; la agencia, el club y el contacto quedan en blanco
 * porque no constan en el control de origen.
 * ------------------------------------------------------------------------ */
/**
 * Jugadores que aparecen en la hoja de control «MAGNO ENTRENOS» de 2026 y en
 * el histórico 2025, pero que no tienen factura a su nombre en el libro de IVA
 * (muchas se emiten a la agencia o a la sociedad que los representa).
 */
const CLIENTES_HISTORICO = [
  'Fermi Seriki', 'Tyler', 'Leo', 'Monchu', 'Fraser', 'Gabz', 'Alvaro Valles',
  'Lucas', 'Josep', 'Armindo (rodion)', 'Sam', 'Luis', 'Will', 'Alvian', 'Buba',
  'Dean', 'Fer', 'Noah', 'Javi Robles', 'Boli', 'Anthony', 'Unique', 'Sebastian',
  'Felix', 'Jeremy', 'Manuel Angel', 'Luke', 'Mangala', 'Noni', 'Brice', 'AJ',
  'Rogon', 'Sunett', 'Rasford', 'Orel Greuel', 'Curtis', 'Jerry Yates',
]

const idCliente = (nombre: string) => `cli_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`

/**
 * Fichas de cliente. Se parte de los nombres y CIF reales del libro de
 * facturas emitidas, y se añaden los jugadores del control operativo que no
 * llegaron a facturarse con nombre propio.
 */
const CLIENTES: AppState['clientes'] = (() => {
  const porNombre = new Map<string, AppState['clientes'][number]>()
  for (const f of FACTURAS_EMITIDAS) {
    const clave = f.cliente.trim().toLowerCase()
    if (!clave || porNombre.has(clave)) continue
    porNombre.set(clave, {
      id: idCliente(f.cliente),
      nombre: f.cliente,
      cif: f.cif,
      agencia: '',
      contacto: '',
      club: '',
      notas: '',
      activo: true,
    })
  }
  for (const nombre of CLIENTES_HISTORICO) {
    const clave = nombre.toLowerCase()
    if (porNombre.has(clave)) continue
    porNombre.set(clave, {
      id: idCliente(nombre),
      nombre,
      cif: '',
      agencia: '',
      contacto: '',
      club: '',
      notas: 'De la hoja de control; sin factura a su nombre en el libro de IVA.',
      activo: true,
    })
  }
  return [...porNombre.values()]
})()

/* ---------------------------------------------------------------------------
 * Tarifario.
 *
 * Las tarifas de 2026 son las medias efectivas que se desprenden de las
 * operaciones de esa temporada. Las de 2027 arrancan con esos mismos valores
 * como punto de partida: hay que revisarlas antes de facturar, y ese aviso
 * viaja en las notas de cada linea.
 * ------------------------------------------------------------------------ */
interface DefTarifa {
  servicio: ServicioKey
  proveedorId: string
  concepto: string
  venta: number
  coste: number
  origen: string
  activa?: boolean
}

const TARIFAS_BASE: DefTarifa[] = [
  { servicio: 'campo', proveedorId: 'prov_mfc', concepto: 'Campo · Marbella Football Center', venta: 480, coste: 350, origen: 'hoja de control 2026' },
  { servicio: 'campo', proveedorId: 'prov_banus', concepto: 'Campo · Banus FC', venta: 360, coste: 250, origen: 'hoja de control 2026' },
  { servicio: 'campo', proveedorId: 'prov_estepona', concepto: 'Campo · Estepona Football Center', venta: 360, coste: 250, origen: 'hoja de control 2026' },
  { servicio: 'campo', proveedorId: 'prov_dama', concepto: 'Campo · Dama de Noche', venta: 360, coste: 250, origen: 'mismo precio que Banus; confirmar' },
  { servicio: 'coach', proveedorId: 'prov_coach', concepto: 'Entrenador', venta: 110, coste: 50, origen: 'hoja MAGNO ENTRENOS 2026: 110 de venta en todas las filas salvo una de 200; el coste pasa de 50 a 70 a partir de julio' },
  { servicio: 'gimnasio', proveedorId: 'prov_gym', concepto: 'Gimnasio', venta: 95, coste: 60, origen: 'hoja MAGNO ENTRENOS 2026: venta de 95 en verano y 90, 85 u 80 en otoño; el coste baja de 60 a 50 en octubre' },
  { servicio: 'fisio', proveedorId: 'prov_fisio', concepto: 'Fisio', venta: 80, coste: 50, origen: 'hoja MAGNO ENTRENOS 2026: 80 de venta en la mayoria de filas; en bloques largos aparece a 180 de venta y 120 de coste' },
  { servicio: 'chef', proveedorId: 'prov_chef', concepto: 'Chef', venta: 180, coste: 120, origen: 'hoja MAGNO ENTRENOS 2026: se factura por importe cerrado (1.683 y 3.300 en 2026), no por tarifa' },
  { servicio: 'chef', proveedorId: 'prov_alojamiento', concepto: 'Villa u hotel', venta: 0, coste: 0, origen: 'se factura por importe cerrado, no por tarifa', activa: false },
]

const TARIFAS: AppState['tarifas'] = [2026, 2027].flatMap((temporada) =>
  TARIFAS_BASE.map((t) => ({
    id: `tar_${temporada}_${t.servicio}_${t.proveedorId}`,
    temporada,
    servicio: t.servicio,
    proveedorId: t.proveedorId,
    concepto: t.concepto,
    tarifaVenta: t.venta,
    tarifaCoste: t.coste,
    activa: t.activa !== false,
    notas: `Tomada de la ${t.origen}.${temporada === 2027 ? ' Revisar antes de facturar 2027.' : ''}`,
  })),
)

/**
 * Totales de la hoja «MAGNO ENTRENOS» de 2026, leídos de las capturas de la
 * hoja. La suma de la columna Base cuadra exactamente con los 110.919,00 €
 * que declara el negocio, y diez de sus filas coinciden al céntimo con
 * facturas del libro de IVA, así que la lectura está contrastada por dos vías.
 */
const FACTURACION_DECLARADA: AppState['facturacionDeclarada'] = [
  {
    temporada: 2026,
    fuente: 'Hoja CONTROL BUSSINES · MAGNO ENTRENOS',
    base: 110919.0,
    total: 131218.86,
    operaciones: 36,
    filasSinIva: 18,
    baseSinIva: 14253.0,
    notas:
      'Las 36 filas de la hoja estan cargadas linea a linea: 16 facturadas con IVA (96.666,00 € de base) y 18 cobradas sin IVA (14.253,00 €), mas 2 filas sin importe. El libro de IVA cargado solo cubre de abril a agosto.',
  },
]

const RESUMENES_DECLARADOS: AppState['resumenesDeclarados'] = [
  {
    temporada: 2025,
    totalFacturado: 96848.15,
    totalGastosProveedores: 40957.42,
    impuestos: 9010.63,
    beneficioNeto: 31946.79,
    detalleCostes: [{ concepto: 'Coste MFC', importe: 8516.3 }],
  },
  {
    // Cifras de la propia hoja MAGNO ENTRENOS, no estimadas: la columna Base
    // suma 110.919,00 y la columna Beneficio 40.095,00.
    temporada: 2026,
    totalFacturado: 110919.0,
    totalGastosProveedores: 70824.0,
    impuestos: 10023.75,
    beneficioNeto: 30071.25,
    sinIva: true,
    detalleCostes: [
      { concepto: 'Campo (MFC, Banus y Estepona)', importe: 37700.0 },
      { concepto: 'Entrenadores', importe: 18180.0 },
      { concepto: 'Gimnasio', importe: 9860.0 },
      { concepto: 'Chef', importe: 4124.0 },
      { concepto: 'Fisio', importe: 960.0 },
    ],
  },
]

export function estadoInicial(): AppState {
  return {
    empresa: 'Magno Marbella · Entrenos Sports Services',
    temporadas: [
      // 2025 sigue reconstruida con fee para cuadrar sus totales declarados.
      // 2026 ya no lo lleva: las 36 filas de la hoja traen precio de venta y
      // coste reales, y el margen sale de la diferencia.
      { year: 2025, impuestoPct: 0.22, ivaPct: 0.21, feePct: 0.2, activa: true },
      { year: 2026, impuestoPct: 0.25, ivaPct: 0.21, feePct: 0, activa: true },
      { year: 2027, impuestoPct: 0.25, ivaPct: 0.21, feePct: 0, activa: true },
    ],
    // 2025 sigue reconstruida a partir de totales; 2026 son las 36 filas
    // reales de la hoja MAGNO ENTRENOS, linea a linea.
    operaciones: [...DEFINICIONES.map(construir), ...operaciones2026()],
    proveedores: PROVEEDORES.map((p) => ({ ...p })),
    liquidaciones: LIQUIDACIONES.map((l) => ({ ...l })),
    clientes: CLIENTES.map((c) => ({ ...c })),
    tarifas: TARIFAS.map((t) => ({ ...t })),
    facturasEmitidas: FACTURAS_EMITIDAS.map((f) => ({ ...f })),
    facturasRecibidas: FACTURAS_RECIBIDAS.map((f) => ({ ...f })),
    categoriasGasto: { ...CATEGORIAS_GASTO },
    categoriasDirectas: [...CATEGORIAS_DIRECTAS_POR_DEFECTO],
    repartoCompartidoPct: 0.5,
    ubicaciones: [...UBICACIONES],
    facturacionDeclarada: FACTURACION_DECLARADA.map((f) => ({ ...f })),
    resumenesDeclarados: RESUMENES_DECLARADOS.map((r) => ({
      ...r,
      detalleCostes: r.detalleCostes.map((d) => ({ ...d })),
    })),
  }
}
