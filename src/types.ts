/** Modelo de datos de Magno Marbella (Entrenos Sports Services). */

/** Servicios facturables. El orden define el orden de presentación en toda la app. */
export const SERVICIOS = ['chef', 'campo', 'coach', 'gimnasio', 'fisio'] as const
export type ServicioKey = (typeof SERVICIOS)[number]

export const SERVICIO_LABEL: Record<ServicioKey, string> = {
  chef: 'Chef / Villa / Hotel',
  campo: 'Campo',
  coach: 'Entrenador / Coach',
  gimnasio: 'Gimnasio',
  fisio: 'Fisio',
}

export const SERVICIO_SHORT: Record<ServicioKey, string> = {
  chef: 'Chef',
  campo: 'Campo',
  coach: 'Coach',
  gimnasio: 'Gym',
  fisio: 'Fisio',
}

/** Unidad en singular, para textos del tipo "precio por hora". */
export const SERVICIO_UNIDAD_SINGULAR: Record<ServicioKey, string> = {
  chef: 'día',
  campo: 'hora',
  coach: 'hora',
  gimnasio: 'hora',
  fisio: 'sesión',
}

export const SERVICIO_UNIDAD: Record<ServicioKey, string> = {
  chef: 'días',
  campo: 'horas',
  coach: 'horas',
  gimnasio: 'horas',
  fisio: 'sesiones',
}

/**
 * Línea de servicio dentro de una operación.
 * `tarifaVenta` es lo que se factura al cliente y `tarifaCoste` lo que se
 * liquida al proveedor, ambos por unidad (hora / dia / sesión).
 */
export interface LineaServicio {
  cantidad: number
  tarifaVenta: number
  tarifaCoste: number
  /** Proveedor al que se liquida el coste de esta línea. */
  proveedorId: string | null
}

export interface Operacion {
  id: string
  numeroFactura: string
  /** ISO yyyy-mm-dd */
  fecha: string
  temporada: number
  ubicacion: string
  jugador: string
  servicios: Record<ServicioKey, LineaServicio>
  /** Fee de servicio aplicado sobre el subtotal de venta (0.20 = 20%). */
  feePct: number
  /** IVA repercutido al cliente (0.21 = 21%). 0 para operaciones exentas. */
  ivaVentaPct: number
  /** IVA soportado en las facturas de proveedor. */
  ivaCostePct: number
  /** Importe ya cobrado al cliente. */
  pagado: number
  notas: string
}

export type TipoProveedor = 'instalacion' | 'coach' | 'chef' | 'fisio' | 'gimnasio' | 'otro'

export const TIPO_PROVEEDOR_LABEL: Record<TipoProveedor, string> = {
  instalacion: 'Instalación / Campo',
  coach: 'Entrenador',
  chef: 'Chef / Alojamiento',
  fisio: 'Fisioterapia',
  gimnasio: 'Gimnasio',
  otro: 'Otro',
}

export interface Proveedor {
  id: string
  nombre: string
  tipo: TipoProveedor
  contacto: string
  /** Tarifa habitual de coste por unidad, usada como valor por defecto. */
  tarifaHabitual: number
  cif: string
  notas: string
  activo: boolean
}

export interface Liquidacion {
  id: string
  proveedorId: string
  fecha: string
  temporada: number
  concepto: string
  importe: number
  estado: 'pendiente' | 'pagada'
}

/** Ficha de cliente: el jugador o la agencia que contrata los servicios. */
export interface Cliente {
  id: string
  nombre: string
  /** Agencia o representante que gestiona al jugador. */
  agencia: string
  contacto: string
  club: string
  notas: string
  activo: boolean
}

/**
 * Entrada del tarifario: el precio de un servicio concreto en una temporada,
 * con lo que se cobra al cliente y lo que se paga al proveedor.
 * Al darla de alta en una operación rellena las dos tarifas de golpe.
 */
export interface Tarifa {
  id: string
  temporada: number
  servicio: ServicioKey
  proveedorId: string | null
  /** Nombre con el que se elige en el alta: "Campo 11 · MFC", "Coach sénior"… */
  concepto: string
  /** Precio por unidad al cliente, antes del fee de servicio y del IVA. */
  tarifaVenta: number
  /** Coste por unidad del proveedor, antes de IVA. */
  tarifaCoste: number
  notas: string
  /** Una tarifa inactiva se conserva pero no se ofrece al crear operaciones. */
  activa: boolean
}

export interface Temporada {
  year: number
  /** Impuesto de sociedades aplicado al margen bruto (0.22 = 22%). */
  impuestoPct: number
  ivaPct: number
  feePct: number
  activa: boolean
}

/** Cifras oficiales declaradas en el control operativo, para conciliación. */
export interface ResumenDeclarado {
  temporada: number
  totalFacturado: number
  totalGastosProveedores: number
  impuestos: number
  beneficioNeto: number
  detalleCostes: { concepto: string; importe: number }[]
}

export interface AppState {
  empresa: string
  temporadas: Temporada[]
  operaciones: Operacion[]
  proveedores: Proveedor[]
  liquidaciones: Liquidacion[]
  clientes: Cliente[]
  tarifas: Tarifa[]
  ubicaciones: string[]
  resumenesDeclarados: ResumenDeclarado[]
}
