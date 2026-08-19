import {
  SERVICIOS,
  type AppState,
  type Liquidacion,
  type Operacion,
  type ServicioKey,
  type Temporada,
} from '../types'

/** Redondeo contable a 2 decimales, evitando el ruido binario de los float. */
export const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

export interface DesgloseServicio {
  key: ServicioKey
  cantidad: number
  tarifaVenta: number
  tarifaCoste: number
  subtotalVenta: number
  subtotalCoste: number
  margen: number
}

export interface OperacionCalculada {
  op: Operacion
  servicios: DesgloseServicio[]
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
 * Motor de cálculo de una operación.
 *
 *   Subtotal venta   = SUM(cantidad x tarifa cliente)
 *   Fee servicio     = Subtotal venta x fee%          (20% por defecto)
 *   Base imponible   = Subtotal venta + Fee
 *   IVA repercutido  = Base imponible x IVA%          (21% por defecto)
 *   Total venta      = Base imponible + IVA
 *
 *   Base coste       = SUM(cantidad x tarifa proveedor)
 *   IVA soportado    = Base coste x IVA%
 *   Total coste      = Base coste + IVA soportado
 *
 *   Beneficio        = Total venta - Total coste proveedores
 */
export function calcularOperacion(op: Operacion): OperacionCalculada {
  const servicios: DesgloseServicio[] = SERVICIOS.map((key) => {
    const l = op.servicios[key]
    const subtotalVenta = r2(l.cantidad * l.tarifaVenta)
    const subtotalCoste = r2(l.cantidad * l.tarifaCoste)
    return {
      key,
      cantidad: l.cantidad,
      tarifaVenta: l.tarifaVenta,
      tarifaCoste: l.tarifaCoste,
      subtotalVenta,
      subtotalCoste,
      margen: r2(subtotalVenta - subtotalCoste),
    }
  })

  const subtotalVenta = r2(servicios.reduce((a, s) => a + s.subtotalVenta, 0))
  const fee = r2(subtotalVenta * op.feePct)
  const baseImponible = r2(subtotalVenta + fee)
  const ivaVenta = r2(baseImponible * op.ivaVentaPct)
  const totalVenta = r2(baseImponible + ivaVenta)

  const baseCoste = r2(servicios.reduce((a, s) => a + s.subtotalCoste, 0))
  const ivaCoste = r2(baseCoste * op.ivaCostePct)
  const totalCoste = r2(baseCoste + ivaCoste)

  const beneficioOperativo = r2(totalVenta - totalCoste)

  return {
    op,
    servicios,
    subtotalVenta,
    fee,
    baseImponible,
    ivaVenta,
    totalVenta,
    pagado: r2(op.pagado),
    resta: r2(totalVenta - op.pagado),
    baseCoste,
    ivaCoste,
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
  key: ServicioKey
  cantidad: number
  ingreso: number
  coste: number
  margen: number
  margenPct: number
  /** Peso del coste de este servicio sobre el coste total. */
  pesoCostePct: number
}

/**
 * Reparte fee e IVA repercutido de cada operación entre sus servicios en
 * proporción a su subtotal, para que el ingreso por servicio sume el facturado.
 */
export function agruparPorServicio(calculadas: OperacionCalculada[]): FilaServicio[] {
  const map = new Map<ServicioKey, { cantidad: number; ingreso: number; coste: number }>()
  let costeTotal = 0

  for (const c of calculadas) {
    const factorVenta = c.subtotalVenta > 0 ? c.totalVenta / c.subtotalVenta : 0
    const factorCoste = c.baseCoste > 0 ? c.totalCoste / c.baseCoste : 0
    for (const s of c.servicios) {
      if (s.subtotalVenta === 0 && s.subtotalCoste === 0) continue
      const cur = map.get(s.key) ?? { cantidad: 0, ingreso: 0, coste: 0 }
      cur.cantidad += s.cantidad
      cur.ingreso += s.subtotalVenta * factorVenta
      cur.coste += s.subtotalCoste * factorCoste
      costeTotal += s.subtotalCoste * factorCoste
      map.set(s.key, cur)
    }
  }

  return [...map.entries()]
    .map(([key, v]) => {
      const ingreso = r2(v.ingreso)
      const coste = r2(v.coste)
      return {
        key,
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
    const factorCoste = c.baseCoste > 0 ? c.totalCoste / c.baseCoste : 0
    for (const s of c.servicios) {
      if (s.subtotalCoste === 0) continue
      const pid = c.op.servicios[s.key].proveedorId ?? 'sin-asignar'
      const cur = map.get(pid) ?? { coste: 0, ops: new Set<string>() }
      cur.coste += s.subtotalCoste * factorCoste
      cur.ops.add(c.op.id)
      total += s.subtotalCoste * factorCoste
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
