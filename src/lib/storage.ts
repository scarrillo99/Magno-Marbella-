import { SERVICIOS, type AppState, type LineaServicio, type Operacion, type ServicioKey } from '../types'
import { estadoInicial } from '../data/seed'
import { descargarFichero, nombreConFecha, type ResultadoDescarga } from './descarga'

const CLAVE = 'magno-marbella:estado:v1'

const numero = (v: unknown, def = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : def
const texto = (v: unknown, def = ''): string => (typeof v === 'string' ? v : def)

/** Etiquetas de los servicios fijos del modelo antiguo, para la migración. */
const NOMBRES_HEREDADOS: Record<string, string> = {
  chef: 'Chef / Villa / Hotel',
  campo: 'Campo',
  coach: 'Entrenador / Coach',
  gimnasio: 'Gimnasio',
  fisio: 'Fisio',
}

let contadorLinea = 0
const idLinea = () => `lin_mig_${(contadorLinea += 1)}`

let contadorId = 0
const uidSimple = (p: string) => `${p}_mig_${(contadorId += 1)}`

/**
 * Convierte una operación del modelo antiguo —cinco servicios fijos y el IVA
 * a nivel de operación— al actual, de líneas libres con su propio IVA.
 * Los importes no cambian: cada servicio con datos pasa a ser una línea con
 * el mismo precio, coste y tipo de IVA que tenía la operación.
 */
function migrarServiciosALineas(raw: Record<string, unknown>): LineaServicio[] {
  const servicios = (raw.servicios ?? {}) as Record<string, Record<string, unknown> | undefined>
  const ivaVentaPct = numero(raw.ivaVentaPct, 0.21)
  const ivaCostePct = numero(raw.ivaCostePct, 0.21)

  return Object.entries(servicios)
    .filter(([, l]) => {
      if (!l) return false
      return numero(l.cantidad) !== 0 || numero(l.tarifaVenta) !== 0 || numero(l.tarifaCoste) !== 0
    })
    .map(([key, l]) => ({
      id: idLinea(),
      nombre: NOMBRES_HEREDADOS[key] ?? key,
      cantidad: numero(l!.cantidad),
      tarifaVenta: numero(l!.tarifaVenta),
      tarifaCoste: numero(l!.tarifaCoste),
      proveedorId: typeof l!.proveedorId === 'string' ? l!.proveedorId : null,
      ivaVentaPct,
      ivaCostePct,
    }))
}

function normalizarLinea(raw: unknown): LineaServicio {
  const l = (raw ?? {}) as Record<string, unknown>
  return {
    id: texto(l.id) || idLinea(),
    nombre: texto(l.nombre),
    cantidad: numero(l.cantidad),
    tarifaVenta: numero(l.tarifaVenta),
    tarifaCoste: numero(l.tarifaCoste),
    proveedorId: typeof l.proveedorId === 'string' ? l.proveedorId : null,
    ivaVentaPct: numero(l.ivaVentaPct),
    ivaCostePct: numero(l.ivaCostePct),
  }
}

function normalizarOperacion(raw: unknown, base: Operacion): Operacion {
  const o = (raw ?? {}) as Record<string, unknown>
  return {
    id: texto(o.id, base.id),
    numeroFactura: texto(o.numeroFactura, base.numeroFactura),
    fecha: texto(o.fecha, base.fecha),
    temporada: numero(o.temporada, base.temporada),
    ubicacion: texto(o.ubicacion, base.ubicacion),
    jugador: texto(o.jugador, base.jugador),
    lineas: Array.isArray(o.lineas) ? o.lineas.map(normalizarLinea) : migrarServiciosALineas(o),
    feePct: numero(o.feePct, 0.2),
    descuento: numero(o.descuento),
    pagado: numero(o.pagado),
    pagosProveedor:
      o.pagosProveedor && typeof o.pagosProveedor === 'object'
        ? Object.fromEntries(
            Object.entries(o.pagosProveedor as Record<string, unknown>).map(([k, v]) => [k, numero(v)]),
          )
        : {},
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
    clientes: Array.isArray(s.clientes)
      ? s.clientes.map((c) => ({
          id: texto(c?.id) || `cli_${texto(c?.nombre).toLowerCase()}`,
          nombre: texto(c?.nombre),
          cif: texto(c?.cif),
          agencia: texto(c?.agencia),
          contacto: texto(c?.contacto),
          club: texto(c?.club),
          notas: texto(c?.notas),
          activo: c?.activo !== false,
        }))
      : // Estado anterior al registro de clientes: se reconstruye a partir de
        // los jugadores que ya aparecen en las operaciones guardadas.
        clientesDesdeOperaciones(
          Array.isArray(s.operaciones) ? (s.operaciones as Operacion[]) : base.operaciones,
          base.clientes,
        ),
    tarifas: Array.isArray(s.tarifas)
      ? s.tarifas.map((t) => ({
          id: texto(t?.id),
          temporada: numero(t?.temporada, 2027),
          servicio: (SERVICIOS as readonly string[]).includes(texto(t?.servicio))
            ? (texto(t?.servicio) as ServicioKey)
            : 'campo',
          proveedorId: typeof t?.proveedorId === 'string' ? t.proveedorId : null,
          concepto: texto(t?.concepto),
          tarifaVenta: numero(t?.tarifaVenta),
          tarifaCoste: numero(t?.tarifaCoste),
          notas: texto(t?.notas),
          activa: t?.activa !== false,
        }))
      : base.tarifas,
    facturasEmitidas: Array.isArray(s.facturasEmitidas)
      ? s.facturasEmitidas.map((f) => ({
          id: texto(f?.id) || uidSimple('fe'),
          fecha: texto(f?.fecha),
          numero: texto(f?.numero),
          cliente: texto(f?.cliente),
          cif: texto(f?.cif),
          temporada: numero(f?.temporada, 2026),
          base: numero(f?.base),
          ivaPct: numero(f?.ivaPct),
          retencionPct: numero(f?.retencionPct),
          cobrada: f?.cobrada !== false,
          notas: texto(f?.notas),
        }))
      : base.facturasEmitidas,
    facturasRecibidas: Array.isArray(s.facturasRecibidas)
      ? s.facturasRecibidas.map((f) => ({
          id: texto(f?.id) || uidSimple('fr'),
          fecha: texto(f?.fecha),
          numero: texto(f?.numero),
          proveedor: texto(f?.proveedor),
          cif: texto(f?.cif),
          temporada: numero(f?.temporada, 2026),
          base: numero(f?.base),
          ivaPct: numero(f?.ivaPct),
          retencionPct: numero(f?.retencionPct),
          categoria: texto(f?.categoria, 'otrosGenerales'),
          compartida: f?.compartida === true,
          pagada: f?.pagada !== false,
          notas: texto(f?.notas),
        }))
      : base.facturasRecibidas,
    categoriasGasto:
      s.categoriasGasto && typeof s.categoriasGasto === 'object'
        ? (s.categoriasGasto as Record<string, string>)
        : base.categoriasGasto,
    repartoCompartidoPct: numero(s.repartoCompartidoPct, 0.5),
    ubicaciones: Array.isArray(s.ubicaciones) && s.ubicaciones.length > 0
      ? s.ubicaciones.filter((u): u is string => typeof u === 'string')
      : base.ubicaciones,
    resumenesDeclarados: Array.isArray(s.resumenesDeclarados)
      ? (s.resumenesDeclarados as AppState['resumenesDeclarados'])
      : base.resumenesDeclarados,
  }
}

/** Fichas de cliente derivadas de los jugadores presentes en las operaciones. */
function clientesDesdeOperaciones(
  operaciones: Operacion[],
  semilla: AppState['clientes'],
): AppState['clientes'] {
  const porNombre = new Map(semilla.map((c) => [c.nombre.toLowerCase(), c]))
  for (const op of operaciones) {
    const nombre = texto(op?.jugador).trim()
    if (!nombre || porNombre.has(nombre.toLowerCase())) continue
    porNombre.set(nombre.toLowerCase(), {
      id: `cli_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      nombre,
      cif: '',
      agencia: '',
      contacto: '',
      club: '',
      notas: '',
      activo: true,
    })
  }
  return [...porNombre.values()]
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
