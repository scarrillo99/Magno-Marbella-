import {
  SERVICIO_LABEL,
  type AppState,
  type LineaServicio,
  type Operacion,
  type ServicioKey,
} from '../types'
import { r2 } from '../lib/calc'

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
  'Dama de Noche',
  'Marbella Football Center',
  'Banus FC',
  'Estepona',
  'Villa / Hotel Marbella',
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

  /* ------------------------------ Temporada 2026 ------------------------------ */
  {
    id: 'op_2026_monchu',
    factura: 'MM-2026-001',
    fecha: '2026-01-12',
    temporada: 2026,
    ubicacion: 'Villa / Hotel Marbella',
    jugador: 'Monchu',
    totalVenta: 11351.01,
    totalCoste: 7927.84,
    pagado: 6000,
    notas: 'Paquete completo: villa con chef, campo en MFC y staff propio.',
    mix: {
      chef: { cantidad: 30, venta: 0.45, coste: 0.5, proveedorId: 'prov_alojamiento' },
      campo: { cantidad: 30, venta: 0.3, coste: 0.33, proveedorId: 'prov_mfc' },
      coach: { cantidad: 30, venta: 0.2, coste: 0.14, proveedorId: 'prov_coach' },
      fisio: { cantidad: 8, venta: 0.05, coste: 0.03, proveedorId: 'prov_fisio' },
    },
  },
  {
    id: 'op_2026_alvian',
    factura: 'MM-2026-002',
    fecha: '2026-01-26',
    temporada: 2026,
    ubicacion: 'Marbella Football Center',
    jugador: 'Alvian',
    totalVenta: 5953.2,
    totalCoste: 2831.4,
    notas: 'Operación de referencia en margen para 2026.',
    mix: {
      campo: { cantidad: 30, venta: 0.5, coste: 0.7, proveedorId: 'prov_mfc' },
      coach: { cantidad: 30, venta: 0.4, coste: 0.25, proveedorId: 'prov_coach' },
      gimnasio: { cantidad: 12, venta: 0.1, coste: 0.05, proveedorId: 'prov_gym' },
    },
  },
  {
    id: 'op_2026_noah',
    factura: 'MM-2026-003',
    fecha: '2026-02-09',
    temporada: 2026,
    ubicacion: 'Marbella Football Center',
    jugador: 'Noah',
    totalVenta: 4222.9,
    totalCoste: 2783,
    pagado: 2000,
    notas: 'Pendiente segundo pago del agente.',
    mix: {
      campo: { cantidad: 24, venta: 0.55, coste: 0.72, proveedorId: 'prov_mfc' },
      coach: { cantidad: 24, venta: 0.35, coste: 0.23, proveedorId: 'prov_coach' },
      fisio: { cantidad: 5, venta: 0.1, coste: 0.05, proveedorId: 'prov_fisio' },
    },
  },
  {
    id: 'op_2026_tyler',
    factura: 'MM-2026-004',
    fecha: '2026-02-16',
    temporada: 2026,
    ubicacion: 'Banus FC',
    jugador: 'Tyler',
    totalVenta: 3944.6,
    totalCoste: 3025,
    notas: 'Coste de instalacion elevado: revisar tarifa con Banus FC.',
    mix: {
      campo: { cantidad: 20, venta: 0.55, coste: 0.7, proveedorId: 'prov_banus' },
      coach: { cantidad: 20, venta: 0.45, coste: 0.3, proveedorId: 'prov_coach' },
    },
  },
  {
    id: 'op_2026_leo',
    factura: 'MM-2026-005',
    fecha: '2026-03-02',
    temporada: 2026,
    ubicacion: 'Banus FC',
    jugador: 'Leo',
    totalVenta: 3412.2,
    totalCoste: 2117.5,
    pagado: 1706.1,
    notas: 'Cobrado el 50% a la reserva.',
    mix: {
      campo: { cantidad: 18, venta: 0.55, coste: 0.7, proveedorId: 'prov_banus' },
      coach: { cantidad: 18, venta: 0.45, coste: 0.3, proveedorId: 'prov_coach' },
    },
  },
  {
    id: 'op_2026_gabz',
    factura: 'MM-2026-006',
    fecha: '2026-03-02',
    temporada: 2026,
    ubicacion: 'Banus FC',
    jugador: 'Gabz',
    totalVenta: 3412.2,
    totalCoste: 2117.5,
    notas: 'Bloque paralelo al de Leo, mismas condiciones.',
    mix: {
      campo: { cantidad: 18, venta: 0.55, coste: 0.7, proveedorId: 'prov_banus' },
      coach: { cantidad: 18, venta: 0.45, coste: 0.3, proveedorId: 'prov_coach' },
    },
  },
  {
    id: 'op_2026_varios',
    factura: 'MM-2026-007',
    fecha: '2026-04-06',
    temporada: 2026,
    ubicacion: 'Marbella Football Center',
    jugador: 'Varios (operaciones menores)',
    totalVenta: 12407.89,
    totalCoste: 1497.76,
    notas: 'Registro agregado que cierra la temporada 2026 contra el control operativo. Desglosar según se recuperen las facturas individuales.',
    mix: {
      campo: { cantidad: 30, venta: 0.4, coste: 0.6, proveedorId: 'prov_mfc' },
      coach: { cantidad: 30, venta: 0.45, coste: 0.3, proveedorId: 'prov_coach' },
      gimnasio: { cantidad: 15, venta: 0.15, coste: 0.1, proveedorId: 'prov_gym' },
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
  { id: 'liq_8', proveedorId: 'prov_mfc', fecha: '2026-02-28', temporada: 2026, concepto: 'Alquiler de campo enero-febrero 2026', importe: 7420.0, estado: 'pagada' },
  { id: 'liq_9', proveedorId: 'prov_banus', fecha: '2026-03-31', temporada: 2026, concepto: 'Alquiler de campo Q1 2026', importe: 5210.0, estado: 'pendiente' },
  { id: 'liq_10', proveedorId: 'prov_coach', fecha: '2026-03-15', temporada: 2026, concepto: 'Liquidación staff de entrenadores Q1 2026', importe: 3335.0, estado: 'pendiente' },
  { id: 'liq_11', proveedorId: 'prov_alojamiento', fecha: '2026-02-05', temporada: 2026, concepto: 'Villa y chef bloque Monchu', importe: 3960.0, estado: 'pagada' },
  { id: 'liq_12', proveedorId: 'prov_chef', fecha: '2026-02-20', temporada: 2026, concepto: 'Servicio de chef temporada 2026', importe: 1698.84, estado: 'pendiente' },
]

/* ---------------------------------------------------------------------------
 * Fichas de cliente. Se parte de los jugadores que ya aparecen en las
 * temporadas 2025 y 2026; la agencia, el club y el contacto quedan en blanco
 * porque no constan en el control de origen.
 * ------------------------------------------------------------------------ */
const CLIENTES: AppState['clientes'] = [
  'Rogon',
  'Sunett',
  'Rasford',
  'Orel Greuel',
  'Curtis',
  'Tyler',
  'Jerry Yates',
  'Monchu',
  'Alvian',
  'Noah',
  'Leo',
  'Gabz',
].map((nombre) => ({
  id: `cli_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  nombre,
  agencia: '',
  contacto: '',
  club: '',
  notas: '',
  activo: true,
}))

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
  { servicio: 'campo', proveedorId: 'prov_mfc', concepto: 'Campo · Marbella Football Center', venta: 82.57, coste: 54.38, origen: 'media efectiva 2026' },
  { servicio: 'campo', proveedorId: 'prov_banus', concepto: 'Campo · Banus FC', venta: 72.85, coste: 75.0, origen: 'media efectiva 2026' },
  { servicio: 'campo', proveedorId: 'prov_dama', concepto: 'Campo · Dama de Noche', venta: 86.19, coste: 50.49, origen: 'media efectiva 2025' },
  { servicio: 'campo', proveedorId: 'prov_estepona', concepto: 'Campo · Estepona Sports Complex', venta: 0, coste: 75.0, origen: 'coste habitual del proveedor; precio de venta por definir', activa: false },
  { servicio: 'coach', proveedorId: 'prov_coach', concepto: 'Entrenador · staff Magno', venta: 67.09, coste: 24.72, origen: 'media efectiva 2026' },
  { servicio: 'chef', proveedorId: 'prov_alojamiento', concepto: 'Villa u hotel con chef', venta: 117.26, coste: 109.2, origen: 'media efectiva 2026' },
  { servicio: 'chef', proveedorId: 'prov_chef', concepto: 'Chef privado a domicilio', venta: 178.33, coste: 93.02, origen: 'media efectiva 2025' },
  { servicio: 'fisio', proveedorId: 'prov_fisio', concepto: 'Sesión de fisioterapia', venta: 52.44, coste: 23.97, origen: 'media efectiva 2026' },
  { servicio: 'gimnasio', proveedorId: 'prov_gym', concepto: 'Gimnasio y preparación física', venta: 62.66, coste: 8.92, origen: 'media efectiva 2026' },
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
    notas:
      temporada === 2027
        ? `Tarifa de partida (${t.origen}). Revisar antes de facturar la temporada 2027.`
        : `Calculada como ${t.origen}.`,
  })),
)

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
    temporada: 2026,
    totalFacturado: 44704.0,
    totalGastosProveedores: 22300.0,
    impuestos: 5575.0,
    beneficioNeto: 16725.0,
    detalleCostes: [
      { concepto: 'Coste MFC', importe: 19411.9 },
      { concepto: 'Coste coaches', importe: 3335.0 },
      { concepto: 'Coste chef', importe: 1698.84 },
    ],
  },
]

export function estadoInicial(): AppState {
  return {
    empresa: 'Magno Marbella · Entrenos Sports Services',
    temporadas: [
      { year: 2025, impuestoPct: 0.22, ivaPct: 0.21, feePct: 0.2, activa: true },
      { year: 2026, impuestoPct: 0.25, ivaPct: 0.21, feePct: 0.2, activa: true },
      { year: 2027, impuestoPct: 0.25, ivaPct: 0.21, feePct: 0.2, activa: true },
    ],
    operaciones: DEFINICIONES.map(construir),
    proveedores: PROVEEDORES.map((p) => ({ ...p })),
    liquidaciones: LIQUIDACIONES.map((l) => ({ ...l })),
    clientes: CLIENTES.map((c) => ({ ...c })),
    tarifas: TARIFAS.map((t) => ({ ...t })),
    ubicaciones: [...UBICACIONES],
    resumenesDeclarados: RESUMENES_DECLARADOS.map((r) => ({
      ...r,
      detalleCostes: r.detalleCostes.map((d) => ({ ...d })),
    })),
  }
}
