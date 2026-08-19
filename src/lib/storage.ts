import { SERVICIOS, type AppState, type LineaServicio, type Operacion } from '../types'
import { estadoInicial } from '../data/seed'
import { descargarFichero, nombreConFecha, type ResultadoDescarga } from './descarga'

const CLAVE = 'magno-marbella:estado:v1'

const numero = (v: unknown, def = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : def
const texto = (v: unknown, def = ''): string => (typeof v === 'string' ? v : def)

const LINEA_VACIA: LineaServicio = { cantidad: 0, tarifaVenta: 0, tarifaCoste: 0, proveedorId: null }

function normalizarOperacion(raw: unknown, base: Operacion): Operacion {
  const o = (raw ?? {}) as Record<string, unknown>
  const serviciosRaw = (o.servicios ?? {}) as Record<string, unknown>
  const servicios = {} as Operacion['servicios']
  for (const key of SERVICIOS) {
    const l = (serviciosRaw[key] ?? {}) as Record<string, unknown>
    servicios[key] = {
      cantidad: numero(l.cantidad),
      tarifaVenta: numero(l.tarifaVenta),
      tarifaCoste: numero(l.tarifaCoste),
      proveedorId: typeof l.proveedorId === 'string' ? l.proveedorId : null,
    }
    if (!serviciosRaw[key]) servicios[key] = { ...LINEA_VACIA }
  }
  return {
    id: texto(o.id, base.id),
    numeroFactura: texto(o.numeroFactura, base.numeroFactura),
    fecha: texto(o.fecha, base.fecha),
    temporada: numero(o.temporada, base.temporada),
    ubicacion: texto(o.ubicacion, base.ubicacion),
    jugador: texto(o.jugador, base.jugador),
    servicios,
    feePct: numero(o.feePct, 0.2),
    ivaVentaPct: numero(o.ivaVentaPct, 0.21),
    ivaCostePct: numero(o.ivaCostePct, 0.21),
    pagado: numero(o.pagado),
    notas: texto(o.notas),
  }
}

/**
 * Normaliza un estado de origen desconocido (localStorage o fichero importado)
 * contra la forma actual del modelo, para que una versión antigua o un JSON
 * incompleto no rompan la aplicación.
 */
export function normalizarEstado(raw: unknown): AppState {
  const base = estadoInicial()
  const s = (raw ?? {}) as Partial<AppState>
  const plantillaOp = base.operaciones[0]

  const temporadas = Array.isArray(s.temporadas) && s.temporadas.length > 0
    ? s.temporadas.map((t) => ({
        year: numero(t?.year, 2025),
        impuestoPct: numero(t?.impuestoPct, 0.25),
        ivaPct: numero(t?.ivaPct, 0.21),
        feePct: numero(t?.feePct, 0.2),
        activa: t?.activa !== false,
      }))
    : base.temporadas

  return {
    empresa: texto(s.empresa, base.empresa),
    temporadas: temporadas.sort((a, b) => a.year - b.year),
    operaciones: Array.isArray(s.operaciones)
      ? s.operaciones.map((o) => normalizarOperacion(o, plantillaOp))
      : base.operaciones,
    proveedores: Array.isArray(s.proveedores)
      ? s.proveedores.map((p) => ({
          id: texto(p?.id),
          nombre: texto(p?.nombre),
          tipo: p?.tipo ?? 'otro',
          contacto: texto(p?.contacto),
          tarifaHabitual: numero(p?.tarifaHabitual),
          cif: texto(p?.cif),
          notas: texto(p?.notas),
          activo: p?.activo !== false,
        }))
      : base.proveedores,
    liquidaciones: Array.isArray(s.liquidaciones)
      ? s.liquidaciones.map((l) => ({
          id: texto(l?.id),
          proveedorId: texto(l?.proveedorId),
          fecha: texto(l?.fecha),
          temporada: numero(l?.temporada, 2026),
          concepto: texto(l?.concepto),
          importe: numero(l?.importe),
          estado: l?.estado === 'pagada' ? 'pagada' : 'pendiente',
        }))
      : base.liquidaciones,
    ubicaciones: Array.isArray(s.ubicaciones) && s.ubicaciones.length > 0
      ? s.ubicaciones.filter((u): u is string => typeof u === 'string')
      : base.ubicaciones,
    resumenesDeclarados: Array.isArray(s.resumenesDeclarados)
      ? (s.resumenesDeclarados as AppState['resumenesDeclarados'])
      : base.resumenesDeclarados,
  }
}

export function cargarEstado(): AppState {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return estadoInicial()
    return normalizarEstado(JSON.parse(raw))
  } catch {
    return estadoInicial()
  }
}

export function guardarEstado(estado: AppState): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado))
  } catch {
    /* cuota agotada o almacenamiento no disponible: la sesión sigue en memoria */
  }
}

export function limpiarEstado(): void {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function descargarJSON(estado: AppState): Promise<ResultadoDescarga> {
  return descargarFichero(
    nombreConFecha('magno-marbella', 'json'),
    JSON.stringify(estado, null, 2),
    'application/json',
  )
}
