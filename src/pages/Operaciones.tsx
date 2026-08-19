import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useStore } from '../store/store'
import { calcularOperacion, resumirOperaciones, type OperacionCalculada } from '../lib/calc'
import { eur, fechaCorta, pct } from '../lib/format'
import { SERVICIOS, SERVICIO_LABEL, SERVICIO_SHORT, type Operacion } from '../types'
import { Badge, Boton, Confirmacion, NumeroInput, Panel, Vacio } from '../components/ui'
import { OperacionModal } from './OperacionModal'

type Orden =
  | 'fecha'
  | 'jugador'
  | 'totalVenta'
  | 'totalCoste'
  | 'beneficioOperativo'
  | 'margenPct'
  | 'resta'

const COLUMNAS: { id: Orden; label: string; numerica: boolean }[] = [
  { id: 'fecha', label: 'Fecha', numerica: false },
  { id: 'jugador', label: 'Jugador / ubicación', numerica: false },
  { id: 'totalVenta', label: 'Total venta', numerica: true },
  { id: 'resta', label: 'Cobrado / pendiente', numerica: true },
  { id: 'totalCoste', label: 'Total coste', numerica: true },
  { id: 'beneficioOperativo', label: 'Beneficio', numerica: true },
  { id: 'margenPct', label: 'Margen', numerica: true },
]

export function Operaciones() {
  const {
    estado,
    operacionesFiltradas,
    crearOperacion,
    actualizarOperacion,
    borrarOperacion,
    duplicarOperacion,
  } = useStore()

  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('fecha')
  const [asc, setAsc] = useState(false)
  const [editando, setEditando] = useState<Operacion | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [aBorrar, setABorrar] = useState<Operacion | null>(null)

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const base = operacionesFiltradas
      .filter(
        (o) =>
          !q ||
          o.jugador.toLowerCase().includes(q) ||
          o.ubicacion.toLowerCase().includes(q) ||
          o.numeroFactura.toLowerCase().includes(q) ||
          o.notas.toLowerCase().includes(q),
      )
      .map(calcularOperacion)

    const dir = asc ? 1 : -1
    return base.sort((a, b) => {
      switch (orden) {
        case 'fecha':
          return dir * a.op.fecha.localeCompare(b.op.fecha)
        case 'jugador':
          return dir * a.op.jugador.localeCompare(b.op.jugador, 'es')
        default:
          return dir * (a[orden] - b[orden])
      }
    })
  }, [operacionesFiltradas, busqueda, orden, asc])

  const totales = useMemo(() => resumirOperaciones(filas, estado.temporadas), [filas, estado.temporadas])

  const abrirNueva = () => {
    setEditando(crearOperacion())
    setModalAbierto(true)
  }

  const abrirEdicion = (op: Operacion) => {
    setEditando(op)
    setModalAbierto(true)
  }

  const ordenarPor = (col: Orden) => {
    if (col === orden) setAsc((v) => !v)
    else {
      setOrden(col)
      setAsc(col === 'jugador')
    }
  }

  const exportarCSV = () => {
    const cab = [
      'Nº factura',
      'Fecha',
      'Temporada',
      'Jugador',
      'Ubicación',
      ...SERVICIOS.flatMap((k) => [
        `${SERVICIO_SHORT[k]} cantidad`,
        `${SERVICIO_SHORT[k]} tarifa venta`,
        `${SERVICIO_SHORT[k]} tarifa coste`,
      ]),
      'Subtotal venta',
      'Fee servicio',
      'Base imponible',
      'IVA venta',
      'Total venta',
      'Pagado',
      'Pendiente',
      'Base coste',
      'IVA coste',
      'Total coste',
      'Beneficio',
      'Margen %',
      'Notas',
    ]
    const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const lineas = filas.map((c) =>
      [
        c.op.numeroFactura,
        c.op.fecha,
        c.op.temporada,
        c.op.jugador,
        c.op.ubicacion,
        ...SERVICIOS.flatMap((k) => [
          c.op.servicios[k].cantidad,
          c.op.servicios[k].tarifaVenta,
          c.op.servicios[k].tarifaCoste,
        ]),
        c.subtotalVenta,
        c.fee,
        c.baseImponible,
        c.ivaVenta,
        c.totalVenta,
        c.pagado,
        c.resta,
        c.baseCoste,
        c.ivaCoste,
        c.totalCoste,
        c.beneficioOperativo,
        (c.margenPct * 100).toFixed(2),
        c.op.notas,
      ]
        .map(escapar)
        .join(';'),
    )
    const csv = `﻿${[cab.map(escapar).join(';'), ...lineas].join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `magno-operaciones-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <Panel
        sinPadding
        titulo="Registros de operaciones"
        descripcion="Edición directa en la tabla o ficha completa con el desglose de servicios"
        acciones={
          <>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar jugador, factura, ubicación…"
                className="campo w-56 pl-8"
                aria-label="Buscar operaciones"
              />
            </div>
            <Boton onClick={exportarCSV} title="Exportar la vista actual a CSV">
              <Download size={13} /> CSV
            </Boton>
            <Boton variante="primario" onClick={abrirNueva}>
              <Plus size={13} /> Nueva operación
            </Boton>
          </>
        }
      >
        {filas.length === 0 ? (
          <Vacio
            titulo="Sin resultados"
            mensaje={
              busqueda
                ? 'Ninguna operación coincide con la búsqueda.'
                : 'Todavía no hay operaciones registradas en esta temporada.'
            }
            accion={
              <Boton variante="primario" onClick={abrirNueva}>
                <Plus size={13} /> Crear la primera
              </Boton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="sticky top-0 z-10 bg-panel">
                <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                  <th className="w-8 px-2 py-2.5" />
                  {COLUMNAS.map((c) => (
                    <th
                      key={c.id}
                      className={`px-3 py-2.5 font-medium ${c.numerica ? 'text-right' : 'text-left'}`}
                    >
                      <button
                        type="button"
                        onClick={() => ordenarPor(c.id)}
                        className={`inline-flex items-center gap-1 transition-colors hover:text-tinta ${
                          orden === c.id ? 'text-oro' : ''
                        }`}
                      >
                        {c.label}
                        {orden === c.id && <span aria-hidden>{asc ? '↑' : '↓'}</span>}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => (
                  <FilaOperacion
                    key={c.op.id}
                    c={c}
                    expandida={expandida === c.op.id}
                    onExpandir={() => setExpandida((v) => (v === c.op.id ? null : c.op.id))}
                    onEditar={() => abrirEdicion(c.op)}
                    onDuplicar={() => duplicarOperacion(c.op.id)}
                    onBorrar={() => setABorrar(c.op)}
                    onCambio={(cambios) => actualizarOperacion(c.op.id, cambios)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-borde-fuerte bg-panel-2/60 text-sm font-semibold">
                  <td />
                  <td className="px-3 py-3 text-tinta-2" colSpan={2}>
                    {filas.length} operación{filas.length === 1 ? '' : 'es'}
                  </td>
                  <td className="cifra px-3 py-3 text-right text-oro">{eur(totales.totalFacturado)}</td>
                  <td className="cifra px-3 py-3 text-right text-azul">{eur(totales.pendienteCobro)}</td>
                  <td className="cifra px-3 py-3 text-right text-rojo">
                    {eur(totales.totalCostesProveedores)}
                  </td>
                  <td className="cifra px-3 py-3 text-right text-verde">{eur(totales.margenBruto)}</td>
                  <td className="cifra px-3 py-3 text-right text-tinta-2">{pct(totales.margenPct)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      <OperacionModal
        operacion={editando}
        abierto={modalAbierto}
        onCerrar={() => {
          setModalAbierto(false)
          setEditando(null)
        }}
      />

      <Confirmacion
        abierto={aBorrar !== null}
        titulo="Eliminar operación"
        mensaje={
          <>
            Se eliminará la operación <strong className="text-tinta">{aBorrar?.numeroFactura}</strong> de{' '}
            <strong className="text-tinta">{aBorrar?.jugador || 'sin jugador'}</strong>. Esta acción no se puede
            deshacer.
          </>
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar) borrarOperacion(aBorrar.id)
          setABorrar(null)
        }}
      />
    </div>
  )
}

function FilaOperacion({
  c,
  expandida,
  onExpandir,
  onEditar,
  onDuplicar,
  onBorrar,
  onCambio,
}: {
  c: OperacionCalculada
  expandida: boolean
  onExpandir: () => void
  onEditar: () => void
  onDuplicar: () => void
  onBorrar: () => void
  onCambio: (cambios: Partial<Operacion>) => void
}) {
  const { op } = c
  const cobrada = c.resta <= 0.005

  return (
    <>
      <tr className="group border-b border-borde/60 transition-colors hover:bg-panel-2/50">
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onExpandir}
            aria-expanded={expandida}
            aria-label={expandida ? 'Contraer desglose' : 'Ver desglose de servicios'}
            className="rounded p-1 text-tinta-3 transition-colors hover:bg-panel-2 hover:text-tinta"
          >
            {expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>

        <td className="px-3 py-2">
          <input
            type="date"
            value={op.fecha}
            onChange={(e) => onCambio({ fecha: e.target.value })}
            className="celda-edit w-[126px]"
            aria-label={`Fecha de ${op.numeroFactura}`}
          />
          <span className="mt-0.5 block px-1.5 text-[11px] text-tinta-3">{op.numeroFactura}</span>
        </td>

        <td className="px-3 py-2">
          <input
            value={op.jugador}
            onChange={(e) => onCambio({ jugador: e.target.value })}
            placeholder="Jugador"
            className="celda-edit font-medium"
            aria-label="Nombre del jugador"
          />
          <input
            value={op.ubicacion}
            onChange={(e) => onCambio({ ubicacion: e.target.value })}
            placeholder="Ubicación"
            className="celda-edit text-[11px] text-tinta-3"
            aria-label="Ubicación"
          />
        </td>

        <td className="cifra px-3 py-2 text-right font-medium text-oro">{eur(c.totalVenta)}</td>

        <td className="px-3 py-2 text-right">
          <NumeroInput
            valor={op.pagado}
            onValor={(n) => onCambio({ pagado: n })}
            className="celda-edit w-full text-right text-[11px] text-tinta-2"
            claseContenedor="ml-auto w-28"
            sufijo="€"
            aria-label="Importe cobrado"
          />
          <span className={`mt-0.5 block px-1.5 text-right text-xs ${cobrada ? 'text-verde' : 'text-azul'}`}>
            {cobrada ? 'Cobrada' : `Restan ${eur(c.resta)}`}
          </span>
        </td>

        <td className="cifra px-3 py-2 text-right text-rojo">{eur(c.totalCoste)}</td>

        <td
          className={`cifra px-3 py-2 text-right font-medium ${
            c.beneficioOperativo >= 0 ? 'text-verde' : 'text-rojo'
          }`}
        >
          {eur(c.beneficioOperativo)}
        </td>

        <td className="px-3 py-2 text-right">
          <Badge tono={c.margenPct < 0.15 ? 'rojo' : c.margenPct > 0.4 ? 'verde' : 'oro'}>
            {pct(c.margenPct)}
          </Badge>
        </td>

        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={onEditar}
              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-oro"
              title="Editar ficha completa"
              aria-label={`Editar ${op.numeroFactura}`}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={onDuplicar}
              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-azul"
              title="Duplicar operación"
              aria-label={`Duplicar ${op.numeroFactura}`}
            >
              <Copy size={13} />
            </button>
            <button
              type="button"
              onClick={onBorrar}
              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-rojo"
              title="Eliminar operación"
              aria-label={`Eliminar ${op.numeroFactura}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {expandida && (
        <tr className="border-b border-borde/60 bg-lienzo/40">
          <td />
          <td colSpan={8} className="px-3 py-3">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="overflow-x-auto rounded-lg border border-borde">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-borde text-[10px] uppercase tracking-wider text-tinta-3">
                      <th className="px-2.5 py-1.5 text-left font-medium">Servicio</th>
                      <th className="px-2 py-1.5 text-right font-medium">Cant.</th>
                      <th className="px-2 py-1.5 text-right font-medium">Tarifa cliente</th>
                      <th className="px-2 py-1.5 text-right font-medium">Venta</th>
                      <th className="px-2 py-1.5 text-right font-medium">Tarifa prov.</th>
                      <th className="px-2 py-1.5 text-right font-medium">Coste</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.servicios
                      .filter((s) => s.cantidad > 0 || s.subtotalVenta > 0 || s.subtotalCoste > 0)
                      .map((s) => (
                        <tr key={s.key} className="border-b border-borde/50 last:border-0">
                          <td className="px-2.5 py-1.5 text-tinta-2">{SERVICIO_LABEL[s.key]}</td>
                          <td className="cifra px-2 py-1.5 text-right text-tinta-2">{s.cantidad}</td>
                          <td className="cifra px-2 py-1.5 text-right text-tinta-2">{eur(s.tarifaVenta)}</td>
                          <td className="cifra px-2 py-1.5 text-right text-tinta">{eur(s.subtotalVenta)}</td>
                          <td className="cifra px-2 py-1.5 text-right text-tinta-2">{eur(s.tarifaCoste)}</td>
                          <td className="cifra px-2 py-1.5 text-right text-rojo">{eur(s.subtotalCoste)}</td>
                          <td className="cifra px-2.5 py-1.5 text-right text-verde">{eur(s.margen)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 rounded-lg border border-borde p-3 text-xs">
                <Resumen label="Subtotal venta" valor={eur(c.subtotalVenta)} />
                <Resumen label={`Fee servicio (${pct(op.feePct, 0)})`} valor={eur(c.fee)} />
                <Resumen label="Base imponible" valor={eur(c.baseImponible)} fuerte />
                <Resumen label={`IVA (${pct(op.ivaVentaPct, 0)})`} valor={eur(c.ivaVenta)} />
                <Resumen label="Total venta" valor={eur(c.totalVenta)} fuerte tono="text-oro" />
                <div className="!my-2 border-t border-borde" />
                <Resumen label="Base coste" valor={eur(c.baseCoste)} />
                <Resumen label={`IVA soportado (${pct(op.ivaCostePct, 0)})`} valor={eur(c.ivaCoste)} />
                <Resumen label="Total coste" valor={eur(c.totalCoste)} fuerte tono="text-rojo" />
                <div className="!my-2 border-t border-borde" />
                <Resumen
                  label="Beneficio operativo"
                  valor={eur(c.beneficioOperativo)}
                  fuerte
                  tono="text-verde"
                />
                {op.notas && (
                  <p className="!mt-3 border-t border-borde pt-2 text-[11px] leading-relaxed text-tinta-3">
                    {op.notas}
                  </p>
                )}
                <p className="!mt-2 text-[11px] text-tinta-3">Registrada el {fechaCorta(op.fecha)}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Resumen({
  label,
  valor,
  fuerte = false,
  tono = 'text-tinta',
}: {
  label: string
  valor: string
  fuerte?: boolean
  tono?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-tinta-2">{label}</span>
      <span className={`cifra ${fuerte ? 'font-semibold' : ''} ${tono}`}>{valor}</span>
    </div>
  )
}
