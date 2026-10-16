import {
  type AppState,
  type FacturaEmitida,
  type FacturaRecibida,
  type Liquidacion,
  type LineaServicio,
  type Operacion,
  type Temporada,
} from '../types'

/** Redondeo contable a 2 decimales, evitando el ruido binario de los float. */
export const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

export interface LineaCalculada {
  linea: LineaServicio
  /** Venta */
  base: number
  fee: number
  baseImponible: number
  iva: number
  totalVenta: number
  /** Coste */
  baseCoste: number
  ivaCoste: number
  totalCoste: number
  /** Resultado */
  beneficio: number
  margenPct: number
}

export interface OperacionCalculada {
  op: Operacion
  lineas: LineaCalculada[]
  /** Venta */
  subtotalVenta: number
  fee: number
  baseImponible: number
  ivaVenta: number
  totalVenta: number
  /** Cobros */
  pagado: number
  resta: number
  /** Coste de proveedores */
  baseCoste: number
  ivaCoste: number
  totalCoste: number
  /** Resultado */
  beneficioOperativo: number
  margenPct: number
}

/**
 * Cálculo de una línea de servicio.
 *
 *   Base venta      = cantidad x precio cliente
 *   Fee servicio    = Base venta x fee%            (0 si la operación no lo aplica)
 *   Base imponible  = Base venta + Fee
 *   IVA repercutido = Base imponible x IVA venta%  (0 si se cobra sin IVA)
 *   Total cliente   = Base imponible + IVA
 *
 *   Base coste      = cantidad x coste proveedor
 *   IVA soportado   = Base coste x IVA coste%
 *   Total proveedor = Base coste + IVA soportado
 *
 *   Beneficio       = Total cliente - Total proveedor
 */
export function calcularLinea(linea: LineaServicio, feePct: number): LineaCalculada {
  const base = r2(linea.cantidad * linea.tarifaVenta)
  const fee = r2(base * feePct)
  const baseImponible = r2(base + fee)
  const iva = r2(baseImponible * linea.ivaVentaPct)
  const totalVenta = r2(baseImponible + iva)

  const baseCoste = r2(linea.cantidad * linea.tarifaCoste)
  const ivaCoste = r2(baseCoste * linea.ivaCostePct)
  const totalCoste = r2(baseCoste + ivaCoste)

  const beneficio = r2(totalVenta - totalCoste)

  return {
    linea,
    base,
    fee,
    baseImponible,
    iva,
    totalVenta,
    baseCoste,
    ivaCoste,
    totalCoste,
    beneficio,
    margenPct: totalVenta > 0 ? beneficio / totalVenta : 0,
  }
}

/** Cálculo de una operación: la suma de sus líneas. */
export function calcularOperacion(op: Operacion): OperacionCalculada {
  const lineas = op.lineas.map((l) => calcularLinea(l, op.feePct))
  const suma = (f: (l: LineaCalculada) => number) => r2(lineas.reduce((a, l) => a + f(l), 0))

  const totalVenta = suma((l) => l.totalVenta)
  const totalCoste = suma((l) => l.totalCoste)
  const beneficioOperativo = r2(totalVenta - totalCoste)

  return {
    op,
    lineas,
    subtotalVenta: suma((l) => l.base),
    fee: suma((l) => l.fee),
    baseImponible: suma((l) => l.baseImponible),
    ivaVenta: suma((l) => l.iva),
    totalVenta,
    pagado: r2(op.pagado),
    resta: r2(totalVenta - op.pagado),
    baseCoste: suma((l) => l.baseCoste),
    ivaCoste: suma((l) => l.ivaCoste),
    totalCoste,
    beneficioOperativo,
    margenPct: totalVenta > 0 ? beneficioOperativo / totalVenta : 0,
  }
}

export interface ResumenGlobal {
  operaciones: number
  totalFacturado: number
  baseImponible: number
  ivaRepercutido: number
  totalCostesProveedores: number
  baseCoste: number
  ivaSoportado: number
  ivaLiquidar: number
  feeServicio: number
  margenBruto: number
  impuestoSociedades: number
  beneficioNeto: number
  cobrado: number
  pendienteCobro: number
  margenPct: number
  /** Tipo impositivo medio ponderado aplicado sobre el margen bruto. */
  impuestoPctEfectivo: number
}

const RESUMEN_VACIO: ResumenGlobal = {
  operaciones: 0,
  totalFacturado: 0,
  baseImponible: 0,
  ivaRepercutido: 0,
  totalCostesProveedores: 0,
  baseCoste: 0,
  ivaSoportado: 0,
  ivaLiquidar: 0,
  feeServicio: 0,
  margenBruto: 0,
  impuestoSociedades: 0,
  beneficioNeto: 0,
  cobrado: 0,
  pendienteCobro: 0,
  margenPct: 0,
  impuestoPctEfectivo: 0,
}

/**
 * Agrega un conjunto de operaciones ya calculadas.
 * El impuesto de sociedades se aplica por temporada (cada una con su tipo)
 * y solo sobre margenes positivos: una temporada en pérdidas no genera cuota.
 */
export function resumirOperaciones(
  calculadas: OperacionCalculada[],
  temporadas: Temporada[],
): ResumenGlobal {
  if (calculadas.length === 0) return { ...RESUMEN_VACIO }

  const acc = { ...RESUMEN_VACIO }
  const margenPorTemporada = new Map<number, number>()

  for (const c of calculadas) {
    acc.totalFacturado += c.totalVenta
    acc.baseImponible += c.baseImponible
    acc.ivaRepercutido += c.ivaVenta
    acc.totalCostesProveedores += c.totalCoste
    acc.baseCoste += c.baseCoste
    acc.ivaSoportado += c.ivaCoste
    acc.feeServicio += c.fee
    acc.cobrado += c.pagado
    acc.pendienteCobro += c.resta
    const t = c.op.temporada
    margenPorTemporada.set(t, (margenPorTemporada.get(t) ?? 0) + c.beneficioOperativo)
  }

  acc.margenBruto = r2(acc.totalFacturado - acc.totalCostesProveedores)
  acc.ivaLiquidar = r2(acc.ivaRepercutido - acc.ivaSoportado)

  let impuesto = 0
  for (const [year, margen] of margenPorTemporada) {
    if (margen <= 0) continue
    impuesto += margen * tipoImpuesto(temporadas, year)
  }
  acc.impuestoSociedades = r2(impuesto)
  acc.beneficioNeto = r2(acc.margenBruto - acc.impuestoSociedades)

  acc.operaciones = calculadas.length
  acc.totalFacturado = r2(acc.totalFacturado)
  acc.baseImponible = r2(acc.baseImponible)
  acc.ivaRepercutido = r2(acc.ivaRepercutido)
  acc.totalCostesProveedores = r2(acc.totalCostesProveedores)
  acc.baseCoste = r2(acc.baseCoste)
  acc.ivaSoportado = r2(acc.ivaSoportado)
  acc.feeServicio = r2(acc.feeServicio)
  acc.cobrado = r2(acc.cobrado)
  acc.pendienteCobro = r2(acc.pendienteCobro)
  acc.margenPct = acc.totalFacturado > 0 ? acc.margenBruto / acc.totalFacturado : 0
  acc.impuestoPctEfectivo = acc.margenBruto > 0 ? acc.impuestoSociedades / acc.margenBruto : 0

  return acc
}

export function tipoImpuesto(temporadas: Temporada[], year: number): number {
  return temporadas.find((t) => t.year === year)?.impuestoPct ?? 0.25
}

export interface FilaJugador {
  jugador: string
  operaciones: number
  ubicaciones: string[]
  facturado: number
  coste: number
  beneficio: number
  margenPct: number
  cobrado: number
  pendiente: number
}

export function agruparPorJugador(calculadas: OperacionCalculada[]): FilaJugador[] {
  const map = new Map<string, FilaJugador>()
  for (const c of calculadas) {
    const key = c.op.jugador.trim() || 'Sin asignar'
    let row = map.get(key)
    if (!row) {
      row = {
        jugador: key,
        operaciones: 0,
        ubicaciones: [],
        facturado: 0,
        coste: 0,
        beneficio: 0,
        margenPct: 0,
        cobrado: 0,
        pendiente: 0,
      }
      map.set(key, row)
    }
    row.operaciones += 1
    row.facturado += c.totalVenta
    row.coste += c.totalCoste
    row.beneficio += c.beneficioOperativo
    row.cobrado += c.pagado
    row.pendiente += c.resta
    if (c.op.ubicacion && !row.ubicaciones.includes(c.op.ubicacion)) row.ubicaciones.push(c.op.ubicacion)
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      facturado: r2(r.facturado),
      coste: r2(r.coste),
      beneficio: r2(r.beneficio),
      cobrado: r2(r.cobrado),
      pendiente: r2(r.pendiente),
      margenPct: r.facturado > 0 ? r.beneficio / r.facturado : 0,
    }))
    .sort((a, b) => b.facturado - a.facturado)
}

export interface FilaServicio {
  /** Nombre del servicio, tal cual se escribió en las líneas. */
  nombre: string
  cantidad: number
  ingreso: number
  coste: number
  margen: number
  margenPct: number
  /** Peso del coste de este servicio sobre el coste total. */
  pesoCostePct: number
}

/**
 * Agrupa por nombre de servicio. Las líneas llevan nombre libre, así que se
 * normaliza mayúsculas y espacios para que "Campo MFC" y "campo mfc" no
 * cuenten como dos servicios distintos; se conserva la primera grafía vista.
 */
export function agruparPorServicio(calculadas: OperacionCalculada[]): FilaServicio[] {
  const map = new Map<string, { nombre: string; cantidad: number; ingreso: number; coste: number }>()
  let costeTotal = 0

  for (const c of calculadas) {
    for (const l of c.lineas) {
      if (l.totalVenta === 0 && l.totalCoste === 0) continue
      const nombre = l.linea.nombre.trim() || 'Sin nombre'
      const clave = nombre.toLowerCase()
      const cur = map.get(clave) ?? { nombre, cantidad: 0, ingreso: 0, coste: 0 }
      cur.cantidad += l.linea.cantidad
      cur.ingreso += l.totalVenta
      cur.coste += l.totalCoste
      costeTotal += l.totalCoste
      map.set(clave, cur)
    }
  }

  return [...map.values()]
    .map((v) => {
      const ingreso = r2(v.ingreso)
      const coste = r2(v.coste)
      return {
        nombre: v.nombre,
        cantidad: r2(v.cantidad),
        ingreso,
        coste,
        margen: r2(ingreso - coste),
        margenPct: ingreso > 0 ? (ingreso - coste) / ingreso : 0,
        pesoCostePct: costeTotal > 0 ? coste / costeTotal : 0,
      }
    })
    .sort((a, b) => b.ingreso - a.ingreso)
}

export interface FilaProveedor {
  proveedorId: string
  nombre: string
  tipo: string
  coste: number
  pesoPct: number
  operaciones: number
  liquidado: number
  pendienteLiquidar: number
}

/** Coste imputado a cada proveedor, cruzado con sus liquidaciones. */
export function agruparPorProveedor(
  calculadas: OperacionCalculada[],
  state: AppState,
  liquidacionesFiltradas: Liquidacion[],
): FilaProveedor[] {
  const map = new Map<string, { coste: number; ops: Set<string> }>()
  let total = 0

  for (const c of calculadas) {
    for (const l of c.lineas) {
      if (l.totalCoste === 0) continue
      const pid = l.linea.proveedorId ?? 'sin-asignar'
      const cur = map.get(pid) ?? { coste: 0, ops: new Set<string>() }
      cur.coste += l.totalCoste
      cur.ops.add(c.op.id)
      total += l.totalCoste
      map.set(pid, cur)
    }
  }

  const rows: FilaProveedor[] = [...map.entries()].map(([pid, v]) => {
    const prov = state.proveedores.find((p) => p.id === pid)
    const liqs = liquidacionesFiltradas.filter((l) => l.proveedorId === pid)
    return {
      proveedorId: pid,
      nombre: prov?.nombre ?? 'Sin asignar',
      tipo: prov?.tipo ?? 'otro',
      coste: r2(v.coste),
      pesoPct: total > 0 ? v.coste / total : 0,
      operaciones: v.ops.size,
      liquidado: r2(liqs.filter((l) => l.estado === 'pagada').reduce((a, l) => a + l.importe, 0)),
      pendienteLiquidar: r2(liqs.filter((l) => l.estado === 'pendiente').reduce((a, l) => a + l.importe, 0)),
    }
  })

  // Proveedores sin coste imputado pero con liquidaciones abiertas.
  for (const p of state.proveedores) {
    if (map.has(p.id)) continue
    const liqs = liquidacionesFiltradas.filter((l) => l.proveedorId === p.id)
    if (liqs.length === 0) continue
    rows.push({
      proveedorId: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      coste: 0,
      pesoPct: 0,
      operaciones: 0,
      liquidado: r2(liqs.filter((l) => l.estado === 'pagada').reduce((a, l) => a + l.importe, 0)),
      pendienteLiquidar: r2(liqs.filter((l) => l.estado === 'pendiente').reduce((a, l) => a + l.importe, 0)),
    })
  }

  return rows.sort((a, b) => b.coste - a.coste)
}

export interface ResumenLibros {
  emitidas: number
  baseEmitida: number
  ivaRepercutido: number
  totalEmitido: number
  pendienteCobro: number
  recibidas: number
  baseRecibida: number
  ivaSoportado: number
  totalRecibido: number
  /** Parte de los gastos compartidos imputada a Magno. */
  compartidoImputado: number
  compartidoTotal: number
  pendientePago: number
  ivaLiquidar: number
  /** IRPF retenido a profesionales, pendiente de ingresar en Hacienda. */
  retencionPracticada: number
  margen: number
  margenPct: number
}

/**
 * Resumen de los libros de IVA.
 *
 * Un gasto compartido con la otra actividad de la sociedad solo computa en el
 * porcentaje de reparto: su total aparece aparte, para que se vea lo que se ha
 * dejado fuera.
 */
export function resumirLibros(
  emitidas: FacturaEmitida[],
  recibidas: FacturaRecibida[],
  repartoPct: number,
): ResumenLibros {
  const acc: ResumenLibros = {
    emitidas: emitidas.length,
    baseEmitida: 0,
    ivaRepercutido: 0,
    totalEmitido: 0,
    pendienteCobro: 0,
    recibidas: recibidas.length,
    baseRecibida: 0,
    ivaSoportado: 0,
    totalRecibido: 0,
    compartidoImputado: 0,
    compartidoTotal: 0,
    pendientePago: 0,
    ivaLiquidar: 0,
    retencionPracticada: 0,
    margen: 0,
    margenPct: 0,
  }

  for (const f of emitidas) {
    const iva = r2(f.base * f.ivaPct)
    const cobro = r2(f.base + iva - r2(f.base * f.retencionPct))
    acc.baseEmitida += f.base
    acc.ivaRepercutido += iva
    acc.totalEmitido += cobro
    if (!f.cobrada) acc.pendienteCobro += cobro
  }

  for (const f of recibidas) {
    const peso = f.compartida ? repartoPct : 1
    const iva = r2(f.base * f.ivaPct)
    const retencion = r2(f.base * f.retencionPct)
    // Lo que sale de caja hacia el proveedor: la retención se ingresa en
    // Hacienda, no se le paga a él.
    const total = r2(f.base + iva - retencion)
    acc.baseRecibida += f.base * peso
    acc.ivaSoportado += iva * peso
    acc.retencionPracticada += retencion * peso
    acc.totalRecibido += total * peso
    if (f.compartida) {
      acc.compartidoTotal += total
      acc.compartidoImputado += total * peso
    }
    if (!f.pagada) acc.pendientePago += total * peso
  }

  for (const k of [
    'baseEmitida',
    'ivaRepercutido',
    'totalEmitido',
    'pendienteCobro',
    'baseRecibida',
    'ivaSoportado',
    'totalRecibido',
    'compartidoImputado',
    'compartidoTotal',
    'pendientePago',
    'retencionPracticada',
  ] as const) {
    acc[k] = r2(acc[k])
  }

  acc.ivaLiquidar = r2(acc.ivaRepercutido - acc.ivaSoportado)
  acc.margen = r2(acc.totalEmitido - acc.totalRecibido)
  acc.margenPct = acc.totalEmitido > 0 ? acc.margen / acc.totalEmitido : 0
  return acc
}

export interface FilaCategoria {
  categoria: string
  etiqueta: string
  facturas: number
  importe: number
  pesoPct: number
}

/** Gasto imputado a Magno por categoría del libro de recibidas. */
export function agruparGastoPorCategoria(
  recibidas: FacturaRecibida[],
  categorias: Record<string, string>,
  repartoPct: number,
): FilaCategoria[] {
  const map = new Map<string, { facturas: number; importe: number }>()
  let total = 0
  for (const f of recibidas) {
    const peso = f.compartida ? repartoPct : 1
    const importe = r2(f.base + r2(f.base * f.ivaPct) - r2(f.base * f.retencionPct)) * peso
    const cur = map.get(f.categoria) ?? { facturas: 0, importe: 0 }
    cur.facturas += 1
    cur.importe += importe
    total += importe
    map.set(f.categoria, cur)
  }
  return [...map.entries()]
    .map(([categoria, v]) => ({
      categoria,
      etiqueta: categorias[categoria] ?? categoria,
      facturas: v.facturas,
      importe: r2(v.importe),
      pesoPct: total > 0 ? v.importe / total : 0,
    }))
    .sort((a, b) => b.importe - a.importe)
}

export interface PagoProveedor {
  proveedorId: string
  nombre: string
  base: number
  iva: number
  total: number
  conceptos: string[]
}

/**
 * Lo que hay que pagar a cada proveedor por una operación concreta.
 * Es la vista que se necesita para liquidar: importe, IVA y por qué conceptos.
 */
export function pagosPorProveedor(
  calc: OperacionCalculada,
  proveedores: { id: string; nombre: string }[],
): PagoProveedor[] {
  const map = new Map<string, PagoProveedor>()
  for (const l of calc.lineas) {
    if (l.totalCoste === 0) continue
    const pid = l.linea.proveedorId ?? 'sin-asignar'
    const cur = map.get(pid) ?? {
      proveedorId: pid,
      nombre: proveedores.find((p) => p.id === pid)?.nombre ?? 'Sin proveedor asignado',
      base: 0,
      iva: 0,
      total: 0,
      conceptos: [],
    }
    cur.base += l.baseCoste
    cur.iva += l.ivaCoste
    cur.total += l.totalCoste
    const nombre = l.linea.nombre.trim()
    if (nombre && !cur.conceptos.includes(nombre)) cur.conceptos.push(nombre)
    map.set(pid, cur)
  }
  return [...map.values()]
    .map((p) => ({ ...p, base: r2(p.base), iva: r2(p.iva), total: r2(p.total) }))
    .sort((a, b) => b.total - a.total)
}

export interface PuntoTemporal {
  periodo: string
  facturado: number
  coste: number
  margen: number
}

/** Serie mensual ordenada cronologicamente. */
export function serieMensual(calculadas: OperacionCalculada[]): PuntoTemporal[] {
  const map = new Map<string, PuntoTemporal>()
  for (const c of calculadas) {
    const periodo = (c.op.fecha || '').slice(0, 7) || 'sin-fecha'
    const cur = map.get(periodo) ?? { periodo, facturado: 0, coste: 0, margen: 0 }
    cur.facturado += c.totalVenta
    cur.coste += c.totalCoste
    cur.margen += c.beneficioOperativo
    map.set(periodo, cur)
  }
  return [...map.values()]
    .map((p) => ({
      periodo: p.periodo,
      facturado: r2(p.facturado),
      coste: r2(p.coste),
      margen: r2(p.margen),
    }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
}
