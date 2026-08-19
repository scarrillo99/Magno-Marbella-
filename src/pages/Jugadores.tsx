import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { agruparPorJugador, calcularOperacion, type FilaJugador } from '../lib/calc'
import { eur, eur0, pct } from '../lib/format'
import { Badge, Barra, Boton, Confirmacion, Panel, Vacio } from '../components/ui'
import { ClienteModal, clienteVacio } from '../components/ClienteModal'
import type { Cliente } from '../types'
import { EJE, REJILLA, TooltipCaja } from '../components/graficos'

export function Jugadores() {
  const { estado, operacionesFiltradas, guardarCliente, borrarCliente } = useStore()
  const [editandoCliente, setEditandoCliente] = useState<Cliente | null>(null)
  const [clienteABorrar, setClienteABorrar] = useState<Cliente | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<keyof FilaJugador>('facturado')

  const jugadores = useMemo(
    () => agruparPorJugador(operacionesFiltradas.map(calcularOperacion)),
    [operacionesFiltradas],
  )

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const base = q ? jugadores.filter((j) => j.jugador.toLowerCase().includes(q)) : jugadores
    return [...base].sort((a, b) => {
      const va = a[orden]
      const vb = b[orden]
      if (typeof va === 'number' && typeof vb === 'number') return vb - va
      return String(va).localeCompare(String(vb), 'es')
    })
  }, [jugadores, busqueda, orden])

  const maxFacturado = Math.max(1, ...filtrados.map((j) => j.facturado))
  const totalFacturado = filtrados.reduce((a, j) => a + j.facturado, 0)

  const dispersion = filtrados.map((j) => ({
    x: j.facturado,
    y: j.margenPct * 100,
    z: Math.max(1, j.operaciones),
    nombre: j.jugador,
  }))

  const margenMedio =
    totalFacturado > 0 ? filtrados.reduce((a, j) => a + j.beneficio, 0) / totalFacturado : 0

  const registro = (
    <RegistroClientes
      clientes={estado.clientes}
      operaciones={estado.operaciones}
      onEditar={setEditandoCliente}
      onBorrar={setClienteABorrar}
      onNuevo={() => setEditandoCliente(clienteVacio())}
    />
  )

  const modales = (
    <>
      <ClienteModal
        cliente={editandoCliente}
        onGuardar={(c) => {
          guardarCliente(c)
          setEditandoCliente(null)
        }}
        onCerrar={() => setEditandoCliente(null)}
      />
      <Confirmacion
        abierto={clienteABorrar !== null}
        titulo="Eliminar ficha de cliente"
        mensaje={
          <>
            Se eliminará la ficha de <strong className="text-tinta">{clienteABorrar?.nombre}</strong>. Sus
            operaciones se conservan con el nombre tal cual, así que el histórico y los márgenes no cambian.
          </>
        }
        onCancelar={() => setClienteABorrar(null)}
        onConfirmar={() => {
          if (clienteABorrar) borrarCliente(clienteABorrar.id)
          setClienteABorrar(null)
        }}
      />
    </>
  )

  if (jugadores.length === 0) {
    return (
      <div className="space-y-5">
        <Panel>
          <Vacio
            titulo="Sin operaciones en esta temporada"
            mensaje="Todavía no hay facturación que analizar. Da de alta aquí abajo los clientes de la temporada y regístralos en Operaciones."
          />
        </Panel>
        {registro}
        {modales}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel
          titulo="Facturación y margen por jugador"
          descripcion="Cada barra es la facturación del jugador: en rojo lo que se lleva el proveedor, en verde el margen"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtrados.slice(0, 12)} margin={{ left: -8, right: 8, top: 8 }}>
                <CartesianGrid {...REJILLA} />
                <XAxis
                  dataKey="jugador"
                  {...EJE}
                  interval={0}
                  angle={-32}
                  textAnchor="end"
                  height={78}
                  tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
                />
                <YAxis {...EJE} tickFormatter={(v) => eur0(Number(v))} width={74} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<TooltipCaja />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="coste" name="Coste proveedores" stackId="a" fill="var(--color-rojo)" isAnimationActive={false} />
                <Bar
                  dataKey="beneficio"
                  name="Margen"
                  stackId="a"
                  fill="var(--color-verde)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          titulo="Volumen frente a rentabilidad"
          descripcion={`Cada punto es un jugador. Por encima del ${pct(margenMedio, 0)} de margen esta la zona rentable`}
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: -8, right: 12, top: 12, bottom: 4 }}>
                <CartesianGrid {...REJILLA} vertical />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Facturado"
                  {...EJE}
                  tickFormatter={(v) => eur0(Number(v))}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Margen"
                  {...EJE}
                  width={52}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                />
                <ZAxis type="number" dataKey="z" range={[70, 340]} name="Operaciones" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-borde-fuerte)' }}
                  content={
                    <TooltipCaja
                      formateador={(n) => (n > 100 ? eur(n) : `${n.toFixed(1)} %`)}
                      etiquetador={() => 'Jugador'}
                    />
                  }
                />
                <Scatter data={dispersion} name="Jugadores" isAnimationActive={false}>
                  {dispersion.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.y >= margenMedio * 100 ? 'var(--color-verde)' : 'var(--color-rojo)'
                      }
                      fillOpacity={0.75}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-tinta-3">
            El tamaño del punto refleja el número de operaciones. Los puntos abajo a la derecha son clientes con
            mucho volumen y poco margen: primeros candidatos a renegociar tarifas.
          </p>
        </Panel>
      </div>

      <Panel
        sinPadding
        titulo="Detalle por jugador"
        descripcion="Rentabilidad, peso sobre la facturación y estado de cobro"
        acciones={
          <>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar jugador…"
                className="campo w-48 pl-8"
                aria-label="Buscar jugador"
              />
            </div>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as keyof FilaJugador)}
              className="campo w-auto"
              aria-label="Ordenar por"
            >
              <option value="facturado" className="bg-panel">Ordenar por facturado</option>
              <option value="beneficio" className="bg-panel">Ordenar por margen</option>
              <option value="margenPct" className="bg-panel">Ordenar por margen %</option>
              <option value="pendiente" className="bg-panel">Ordenar por pendiente</option>
              <option value="jugador" className="bg-panel">Ordenar por nombre</option>
            </select>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                <th className="px-5 py-2.5 text-left font-medium">Jugador</th>
                <th className="px-3 py-2.5 text-left font-medium">Ubicaciones</th>
                <th className="px-3 py-2.5 text-right font-medium">Ops.</th>
                <th className="px-3 py-2.5 text-right font-medium">Facturado</th>
                <th className="px-3 py-2.5 text-right font-medium">Coste</th>
                <th className="px-3 py-2.5 text-right font-medium">Margen</th>
                <th className="px-3 py-2.5 text-right font-medium">Margen %</th>
                <th className="px-5 py-2.5 text-right font-medium">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((j) => (
                <tr key={j.jugador} className="border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                  <td className="px-5 py-3">
                    <span className="font-medium text-tinta">{j.jugador}</span>
                    <div className="mt-1.5 max-w-[160px]">
                      <Barra valor={j.facturado / maxFacturado} />
                    </div>
                    <span className="mt-1 block text-[11px] text-tinta-3">
                      {pct(totalFacturado > 0 ? j.facturado / totalFacturado : 0, 1)} de la facturación
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-tinta-2">{j.ubicaciones.join(' · ') || '—'}</td>
                  <td className="cifra px-3 py-3 text-right text-tinta-2">{j.operaciones}</td>
                  <td className="cifra px-3 py-3 text-right font-medium text-oro">{eur(j.facturado)}</td>
                  <td className="cifra px-3 py-3 text-right text-rojo">{eur(j.coste)}</td>
                  <td
                    className={`cifra px-3 py-3 text-right font-medium ${
                      j.beneficio >= 0 ? 'text-verde' : 'text-rojo'
                    }`}
                  >
                    {eur(j.beneficio)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Badge tono={j.margenPct < 0.15 ? 'rojo' : j.margenPct > 0.4 ? 'verde' : 'oro'}>
                      {pct(j.margenPct)}
                    </Badge>
                  </td>
                  <td
                    className={`cifra px-5 py-3 text-right ${j.pendiente > 0.005 ? 'text-azul' : 'text-tinta-3'}`}
                  >
                    {j.pendiente > 0.005 ? eur(j.pendiente) : 'Cobrado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {registro}
      {modales}
    </div>
  )
}

/** Fichas de cliente: existen al margen de que hayan facturado o no. */
function RegistroClientes({
  clientes,
  operaciones,
  onEditar,
  onBorrar,
  onNuevo,
}: {
  clientes: Cliente[]
  operaciones: { jugador: string; temporada: number }[]
  onEditar: (c: Cliente) => void
  onBorrar: (c: Cliente) => void
  onNuevo: () => void
}) {
  const temporadasPorCliente = (nombre: string) =>
    [
      ...new Set(
        operaciones
          .filter((o) => o.jugador.trim().toLowerCase() === nombre.trim().toLowerCase())
          .map((o) => o.temporada),
      ),
    ].sort()

  return (
    <Panel
      sinPadding
      titulo="Fichas de cliente"
      descripcion="Registro de jugadores y agencias, independiente de la temporada en vista"
      acciones={
        <Boton variante="primario" onClick={onNuevo}>
          <Plus size={13} /> Nuevo cliente
        </Boton>
      }
    >
      {clientes.length === 0 ? (
        <Vacio
          titulo="Sin fichas de cliente"
          mensaje="Da de alta a los jugadores y agencias con los que trabajas para tenerlos disponibles al crear operaciones."
          accion={
            <Boton variante="primario" onClick={onNuevo}>
              <Plus size={13} /> Crear la primera
            </Boton>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                <th className="px-5 py-2.5 text-left font-medium">Cliente</th>
                <th className="px-3 py-2.5 text-left font-medium">Agencia</th>
                <th className="px-3 py-2.5 text-left font-medium">Club</th>
                <th className="px-3 py-2.5 text-left font-medium">Contacto</th>
                <th className="px-3 py-2.5 text-left font-medium">Temporadas</th>
                <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[...clientes]
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                .map((c) => {
                  const temporadas = temporadasPorCliente(c.nombre)
                  return (
                    <tr key={c.id} className="group border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${c.activo ? 'text-tinta' : 'text-tinta-3 line-through'}`}>
                            {c.nombre}
                          </span>
                          {!c.activo && <Badge>Inactivo</Badge>}
                        </div>
                        {c.notas && (
                          <span className="mt-0.5 block max-w-md text-[11px] text-tinta-3">{c.notas}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-tinta-2">{c.agencia || '—'}</td>
                      <td className="px-3 py-3 text-xs text-tinta-2">{c.club || '—'}</td>
                      <td className="px-3 py-3 text-xs text-tinta-2">{c.contacto || '—'}</td>
                      <td className="px-3 py-3">
                        {temporadas.length === 0 ? (
                          <Badge tono="oro">Sin operaciones</Badge>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {temporadas.map((t) => (
                              <Badge key={t} tono="azul">
                                {t}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => onEditar(c)}
                            className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-oro"
                            aria-label={`Editar ${c.nombre}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onBorrar(c)}
                            className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-rojo"
                            aria-label={`Eliminar ${c.nombre}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
