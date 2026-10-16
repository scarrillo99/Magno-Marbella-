import type { LineaServicio, Operacion } from '../types'
import { parseNumero } from './format'
import { uid } from './id'

/**
 * Importador de la hoja «MAGNO ENTRENOS» de CONTROL BUSSINES.
 *
 * Se pegan las filas tal cual salen de Google Sheets (separadas por
 * tabuladores), con su fila de cabecera. Las columnas se localizan por el
 * nombre de la cabecera, no por su posición, para que la hoja pueda crecer o
 * moverse sin romper la importación.
 *
 * Cada servicio ocupa un bloque de columnas: en el lado de venta
 * [Hora][Precio][Subtotal] y en el de coste [Hora][Precio][Subtotal][IVA][Total].
 * El nombre del servicio (Campo, Entrenador…) aparece dos veces: la primera es
 * la venta y la segunda el coste.
 */

export interface ServicioHoja {
  /** Nombre que tendrá la línea en la operación. */
  nombre: string
  /** Cabecera del bloque de venta. */
  venta: string
  /** Cabecera del bloque de coste, si existe. */
  coste?: string
}

const SERVICIOS_HOJA: ServicioHoja[] = [
  { nombre: 'Chef / Villa', venta: 'cheff o fisio o villa', coste: 'cheff' },
  { nombre: 'Campo', venta: 'campo', coste: 'campo' },
  { nombre: 'Entrenador', venta: 'entrenador', coste: 'entrenador' },
  { nombre: 'Gimnasio', venta: 'gimnasio', coste: 'gimnasio' },
  { nombre: 'Fisio', venta: '', coste: 'fisio' },
]

const normalizar = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')

export interface ResultadoImportacion {
  operaciones: Operacion[]
  avisos: string[]
  /** Cabeceras que no se han sabido interpretar. */
  sinReconocer: string[]
}

/** Índices de todas las columnas cuya cabecera coincide con `nombre`. */
function posiciones(cab: string[], nombre: string): number[] {
  const n = normalizar(nombre)
  return cab.flatMap((c, i) => (normalizar(c) === n ? [i] : []))
}

function unaPosicion(cab: string[], ...nombres: string[]): number {
  for (const n of nombres) {
    const p = posiciones(cab, n)
    if (p.length > 0) return p[0]
  }
  return -1
}

export function importarHojaMagno(
  texto: string,
  temporada: number,
  proveedorPorServicio: Record<string, string | null> = {},
): ResultadoImportacion {
  const avisos: string[] = []
  const filas = texto
    .split(/\r?\n/)
    .map((l) => l.split('\t'))
    .filter((f) => f.some((c) => c.trim() !== ''))

  if (filas.length < 2) {
    return { operaciones: [], avisos: ['Hacen falta la fila de cabecera y al menos una fila de datos.'], sinReconocer: [] }
  }

  // La cabecera es la primera fila que contiene «Nombre».
  const iCab = filas.findIndex((f) => f.some((c) => normalizar(c) === 'nombre'))
  if (iCab === -1) {
    return {
      operaciones: [],
      avisos: ['No se encuentra la fila de cabecera: debe incluir una columna «Nombre».'],
      sinReconocer: [],
    }
  }
  const cab = filas[iCab]

  const iFecha = unaPosicion(cab, 'fecha')
  const iLugar = unaPosicion(cab, 'lugar')
  const iNombre = unaPosicion(cab, 'nombre')
  const iDescuento = unaPosicion(cab, 'descuento', 'descuento:')
  const iPagado = unaPosicion(cab, 'pagado')

  if (iNombre === -1) {
    return { operaciones: [], avisos: ['No se encuentra la columna «Nombre».'], sinReconocer: [] }
  }

  // Para cada servicio, la primera aparición es venta y la segunda coste.
  const bloques = SERVICIOS_HOJA.map((s) => {
    const venta = s.venta ? posiciones(cab, s.venta) : []
    const coste = s.coste ? posiciones(cab, s.coste) : []
    const iVenta = venta.length > 0 ? venta[0] : -1
    // Si venta y coste comparten cabecera, el coste es la segunda aparición.
    const iCoste =
      s.coste && s.venta && normalizar(s.coste) === normalizar(s.venta)
        ? coste.length > 1
          ? coste[1]
          : -1
        : coste.length > 0
          ? coste[0]
          : -1
    return { ...s, iVenta, iCoste }
  })

  const sinBloque = bloques.filter((b) => b.iVenta === -1 && b.iCoste === -1).map((b) => b.nombre)
  if (sinBloque.length > 0) avisos.push(`Sin columnas para: ${sinBloque.join(', ')}.`)

  const num = (f: string[], i: number) => (i >= 0 && i < f.length ? parseNumero(f[i]) : 0)
  const txt = (f: string[], i: number) => (i >= 0 && i < f.length ? f[i].trim() : '')

  const operaciones: Operacion[] = []
  let correlativo = 0

  for (const fila of filas.slice(iCab + 1)) {
    const jugador = txt(fila, iNombre)
    if (!jugador || normalizar(jugador) === 'nombre') continue

    const lineas: LineaServicio[] = []
    for (const b of bloques) {
      // [Hora][Precio][Subtotal] -> la hora está justo antes del precio.
      const cantidadVenta = b.iVenta > 0 ? num(fila, b.iVenta - 1) : 0
      const precioVenta = b.iVenta >= 0 ? num(fila, b.iVenta) : 0
      const cantidadCoste = b.iCoste > 0 ? num(fila, b.iCoste - 1) : 0
      const precioCoste = b.iCoste >= 0 ? num(fila, b.iCoste) : 0

      const cantidad = cantidadVenta || cantidadCoste
      if (cantidad === 0 || (precioVenta === 0 && precioCoste === 0)) continue

      lineas.push({
        id: uid('lin'),
        nombre: b.nombre,
        cantidad,
        tarifaVenta: precioVenta,
        tarifaCoste: precioCoste,
        proveedorId: proveedorPorServicio[b.nombre] ?? null,
        ivaVentaPct: 0.21,
        ivaCostePct: 0.21,
      })
    }

    if (lineas.length === 0) {
      avisos.push(`«${jugador}»: ninguna línea con horas y precio; fila omitida.`)
      continue
    }

    correlativo += 1
    operaciones.push({
      id: uid('op'),
      numeroFactura: `HOJA-${temporada}-${String(correlativo).padStart(3, '0')}`,
      fecha: fechaDesdeTexto(txt(fila, iFecha), temporada),
      temporada,
      ubicacion: txt(fila, iLugar),
      jugador,
      lineas,
      feePct: 0,
      descuento: num(fila, iDescuento),
      pagado: num(fila, iPagado),
      pagosProveedor: {},
      notas: txt(fila, iFecha) ? `Fechas en la hoja: ${txt(fila, iFecha)}` : '',
    })
  }

  const conocidas = new Set<number>([iFecha, iLugar, iNombre, iDescuento, iPagado])
  for (const b of bloques) {
    for (const i of [b.iVenta, b.iCoste]) if (i >= 0) conocidas.add(i)
  }
  const sinReconocer = cab
    .map((c, i) => ({ c: c.trim(), i }))
    .filter((x) => x.c !== '' && !conocidas.has(x.i))
    .map((x) => x.c)

  return { operaciones, avisos, sinReconocer }
}

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
}

/**
 * Las fechas de la hoja son texto libre («29,30 mayo - 1,2,3 junio»). Se toma
 * el primer día y el primer mes que aparezcan; el texto completo se guarda en
 * las notas de la operación.
 */
export function fechaDesdeTexto(texto: string, temporada: number): string {
  const t = normalizar(texto)
  const mes = Object.keys(MESES).find((m) => t.includes(m))
  const dia = /(\d{1,2})/.exec(t)?.[1]
  if (!mes || !dia) return `${temporada}-01-01`
  return `${temporada}-${MESES[mes]}-${dia.padStart(2, '0')}`
}
