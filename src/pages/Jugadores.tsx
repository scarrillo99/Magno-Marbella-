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
import { Search } from 'lucide-react'
import { useStore } from '../store/store'
import { agruparPorJugador, calcularOperacion, type FilaJugador } from '../lib/calc'
import { eur, eur0, pct } from '../lib/format'
import { Badge, Barra, Panel, Vacio } from '../components/ui'
import { EJE, REJILLA, TooltipCaja } from '../components/graficos'

export function Jugadores() {
  const { operacionesFiltradas } = useStore()
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

  if (jugadores.length === 0) {
    return (
      <Panel>
        <Vacio titulo="Sin jugadores" mensaje="No hay operaciones registradas en la temporada seleccionada." />
      </Panel>
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
    </div>
  )
}
