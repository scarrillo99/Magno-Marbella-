/** Modelo de datos de Magno Marbella (Entrenos Sports Services). */

/** Servicios facturables. El orden define el orden de presentación en toda la app. */
export const SERVICIOS = [
  'campo',
  'coach',
  'gimnasio',
  'fisio',
  'chef',
  'villa',
  'coche',
  'barco',
  'restauracion',
  'otro',
] as const
export type ServicioKey = (typeof SERVICIOS)[number]

export const SERVICIO_LABEL: Record<ServicioKey, string> = {
  campo: 'Campo',
  coach: 'Entrenador / Coach',
  gimnasio: 'Gimnasio',
  fisio: 'Fisio',
  chef: 'Chef',
  villa: 'Villa / Hotel',
  coche: 'Alquiler de coche',
  barco: 'Barco',
  restauracion: 'Restauración',
  otro: 'Otros servicios',
}

export const SERVICIO_SHORT: Record<ServicioKey, string> = {
  campo: 'Campo',
  coach: 'Coach',
  gimnasio: 'Gym',
  fisio: 'Fisio',
  chef: 'Chef',
  villa: 'Villa',
  coche: 'Coche',
  barco: 'Barco',
  restauracion: 'Restaurante',
  otro: 'Otros',
}

/** Unidad en singular, para textos del tipo "precio por hora". */
export const SERVICIO_UNIDAD_SINGULAR: Record<ServicioKey, string> = {
  campo: 'hora',
  coach: 'hora',
  gimnasio: 'hora',
  fisio: 'sesión',
  chef: 'día',
  villa: 'noche',
  coche: 'día',
  barco: 'día',
  restauracion: 'reserva',
  otro: 'unidad',
}

export const SERVICIO_UNIDAD: Record<ServicioKey, string> = {
  campo: 'horas',
  coach: 'horas',
  gimnasio: 'horas',
  fisio: 'sesiones',
  chef: 'días',
  villa: 'noches',
  coche: 'días',
  barco: 'días',
  restauracion: 'reservas',
  otro: 'unidades',
}

/**
 * Línea de servicio dentro de una operación.
 *
 * Cada línea es un servicio con nombre libre: lo que se le cobra al cliente,
 * lo que cuesta al proveedor y si lleva IVA o no. El IVA va por línea porque
 * depende de cómo paga el cliente: por transferencia se repercute, en
 * efectivo no.
 */
export interface LineaServicio {
  id: string
  /** Nombre del servicio tal cual aparece en la factura. */
  nombre: string
  cantidad: number
  /** Precio por unidad que se le cobra al cliente, antes de fee e IVA. */
  tarifaVenta: number
  /** Coste por unidad del proveedor, antes de IVA. */
  tarifaCoste: number
  /** Proveedor registrado al que se liquida el coste, si lo hay. */
  proveedorId: string | null
  /**
   * Nombre del proveedor tal cual: el restaurante, la empresa del barco, la
   * villa… Permite anotar un proveedor puntual sin darlo de alta en la ficha.
   * Si coincide con uno registrado, se enlaza también por `proveedorId`.
   */
  proveedorNombre: string
  /** IVA repercutido al cliente. 0 = sin IVA (cobro en efectivo). */
  ivaVentaPct: number
  /** IVA soportado en la factura del proveedor. 0 = proveedor sin IVA. */
  ivaCostePct: number
}

/** Tipos de IVA que se ofrecen en el desplegable de cada línea. */
export const TIPOS_IVA = [0.21, 0.1, 0] as const

export interface Operacion {
  id: string
  numeroFactura: string
  /** ISO yyyy-mm-dd */
  fecha: string
  temporada: number
  ubicacion: string
  jugador: string
  lineas: LineaServicio[]
  /**
   * Fee de servicio sobre el precio de cliente (0.20 = 20%). En la hoja de
   * control no existe: el margen sale del diferencial entre precio y coste,
   * así que por defecto va a 0.
   */
  feePct: number
  /**
   * Descuento en euros sobre el total de servicios, antes de IVA. Se reparte
   * entre las líneas en proporción a su importe, para que cada una conserve
   * su propio tipo de IVA.
   */
  descuento: number
  /** Importe ya cobrado al cliente. */
  pagado: number
  /** Importe ya pagado a cada proveedor en esta operación, por su id. */
  pagosProveedor: Record<string, number>
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
  /** CIF/NIF tal como aparece en la factura. */
  cif: string
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

/**
 * Factura emitida: el libro de IVA repercutido. Es el registro contable de lo
 * que se le cobra al cliente, al margen del detalle operativo de servicios.
 */
export interface FacturaEmitida {
  id: string
  fecha: string
  numero: string
  cliente: string
  cif: string
  temporada: number
  /** Base imponible. Negativa en una factura rectificativa. */
  base: number
  ivaPct: number
  /** Retención de IRPF practicada al cliente. Poco habitual en emitidas. */
  retencionPct: number
  cobrada: boolean
  notas: string
}

/** Factura recibida: el libro de IVA soportado. */
export interface FacturaRecibida {
  id: string
  fecha: string
  numero: string
  proveedor: string
  cif: string
  temporada: number
  base: number
  ivaPct: number
  /**
   * Retención de IRPF de la factura de un profesional autónomo. No se le paga
   * a él: se ingresa en Hacienda, así que el proveedor cobra base + IVA menos
   * esta retención.
   */
  retencionPct: number
  /** Clave de CATEGORIAS_GASTO. */
  categoria: string
  /**
   * Gasto que sirve a Magno y a la agencia a la vez (combustible, vuelos,
   * comidas): solo se imputa a Magno el porcentaje de reparto configurado.
   */
  compartida: boolean
  pagada: boolean
  notas: string
}

/**
 * Facturación que declara la hoja de control de la temporada, para conciliar
 * contra lo que haya cargado en la aplicación.
 */
export interface FacturacionDeclarada {
  temporada: number
  fuente: string
  /** Suma de la columna «Base» de la hoja, sin IVA. */
  base: number
  /** Suma de la columna «Total», con el IVA de cada fila. */
  total: number
  operaciones: number
  /** Filas cobradas sin IVA, y su importe. */
  filasSinIva: number
  baseSinIva: number
  notas: string
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
  facturasEmitidas: FacturaEmitida[]
  facturasRecibidas: FacturaRecibida[]
  /** Categorías de gasto del libro de recibidas, editables. */
  categoriasGasto: Record<string, string>
  /** Categorías que son coste directo del servicio; el resto, estructura. */
  categoriasDirectas: string[]
  /** Porcentaje de los gastos compartidos que se imputa a Magno (0.5 = 50%). */
  repartoCompartidoPct: number
  ubicaciones: string[]
  resumenesDeclarados: ResumenDeclarado[]
  facturacionDeclarada: FacturacionDeclarada[]
}
