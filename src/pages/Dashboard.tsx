import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  Banknote,
  Landmark,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useStore } from '../store/store'
import {
  agruparPorJugador,
  agruparPorProveedor,
  agruparPorServicio,
  calcularOperacion,
  resumirOperaciones,
  serieMensual,
  tipoImpuesto,
} from '../lib/calc'
import { eur, eur0, pct, periodoCorto } from '../lib/format'
import { SERVICIO_LABEL } from '../types'
import { Badge, Barra, Panel, Vacio } from '../components/ui'
import { KpiCard } from '../components/KpiCard'
import { EJE, PALETA, REJILLA, TooltipCaja } from '../components/graficos'

export function Dashboard() {
  const { estado, temporadaSel, operacionesFiltradas, liquidacionesFiltradas, guardarTemporada } = useStore()
  const [topJugadores, setTopJugadores] = useState(8)

  const calculadas = useMemo(() => operacionesFiltradas.map(calcularOperacion), [operacionesFiltradas])
  const resumen = useMemo(() => resumirOperaciones(calculadas, estado.temporadas), [calculadas, estado.temporadas])
  const jugadores = useMemo(() => agruparPorJugador(calculadas), [calculadas])
  const servicios = useMemo(() => agruparPorServicio(calculadas), [calculadas])
  const proveedores = useMemo(
    () => agruparPorProveedor(calculadas, estado, liquidacionesFiltradas),
    [calculadas, estado, liquidacionesFiltradas],
  )
  const serie = useMemo(() => serieMensual(calculadas), [calculadas])

  const temporadaConfig =
    temporadaSel === 'todas' ? null : estado.temporadas.find((t) => t.year === temporadaSel) ?? null

  const pendienteLiquidar = liquidacionesFiltradas
    .filter((l) => l.estado === 'pendiente')
    .reduce((a, l) => a + l.importe, 0)

  const cobroPct = resumen.totalFacturado > 0 ? resumen.cobrado / resumen.totalFacturado : 0

  /* Servicios ordenados por margen: el mejor es la palanca, el peor la fuga. */
  const porMargen = [...servicios].filter((s) => s.ingreso > 0).sort((a, b) => b.margenPct - a.margenPct)
  const mejorServicio = porMargen[0]
  const peorServicio = porMargen.length > 1 ? porMargen[porMargen.length - 1] : undefined

  const jugadoresGrafico = jugadores.slice(0, topJugadores).map((j) => ({
    nombre: j.jugador.length > 16 ? `${j.jugador.slice(0, 15)}…` : j.jugador,
    completo: j.jugador,
    Facturado: j.facturado,
    Margen: j.beneficio,
  }))

  const gastoGrafico = proveedores
    .filter((p) => p.coste > 0)
    .map((p) => ({ nombre: p.nombre, valor: p.coste, peso: p.pesoPct }))

  if (calculadas.length === 0) {
    return (
      <Panel>
        <Vacio
          titulo="Temporada sin operaciones todavía"
          mensaje="Revisa el tarifario, da de alta los clientes en Jugadores y registra la primera operación. Los KPIs aparecerán en cuanto haya facturación."
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      {/* --------------------------------- KPIs ---------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          etiqueta="Ingresos totales"
          valor={eur(resumen.totalFacturado)}
          tono="oro"
          icono={<Receipt size={15} />}
          nota={
            <>
              {resumen.operaciones} operaciones · base {eur0(resumen.baseImponible)} · IVA repercutido{' '}
              {eur0(resumen.ivaRepercutido)}
            </>
          }
          destacado
        />
        <KpiCard
          etiqueta="Costes de proveedores"
          valor={eur(resumen.totalCostesProveedores)}
          tono="rojo"
          icono={<TrendingDown size={15} />}
          progreso={resumen.totalFacturado > 0 ? resumen.totalCostesProveedores / resumen.totalFacturado : 0}
          nota={
            <>
              {pct(resumen.totalFacturado > 0 ? resumen.totalCostesProveedores / resumen.totalFacturado : 0)} de
              los ingresos · IVA soportado {eur0(resumen.ivaSoportado)}
            </>
          }
        />
        <KpiCard
          etiqueta="Margen bruto"
          valor={eur(resumen.margenBruto)}
          tono="verde"
          icono={<TrendingUp size={15} />}
          progreso={resumen.margenPct}
          nota={<>Margen del {pct(resumen.margenPct)} sobre facturación</>}
        />
        <KpiCard
          etiqueta="Impuesto de sociedades"
          valor={eur(resumen.impuestoSociedades)}
          tono="violeta"
          icono={<Landmark size={15} />}
          nota={
            temporadaConfig ? (
              <label className="flex items-center gap-2">
                <span>Tipo aplicado</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Number((temporadaConfig.impuestoPct * 100).toFixed(2))}
                  onChange={(e) =>
                    guardarTemporada({
                      ...temporadaConfig,
                      impuestoPct: Math.max(0, Math.min(100, Number(e.target.value))) / 100,
                    })
                  }
                  className="cifra w-16 rounded-md border border-borde bg-lienzo/60 px-1.5 py-0.5 text-center text-[11px] text-tinta focus:border-oro focus:outline-none"
                  aria-label={`Tipo impositivo de la temporada ${temporadaConfig.year}`}
                />
                <span>%</span>
              </label>
            ) : (
              <>Tipo medio ponderado {pct(resumen.impuestoPctEfectivo)} · editable por temporada</>
            )
          }
        />
        <KpiCard
          etiqueta="Beneficio neto real"
          valor={eur(resumen.beneficioNeto)}
          tono="verde"
          icono={<PiggyBank size={15} />}
          nota={
            <>
              {pct(resumen.totalFacturado > 0 ? resumen.beneficioNeto / resumen.totalFacturado : 0)} de la
              facturación, después de impuestos
            </>
          }
          destacado
        />
        <KpiCard
          etiqueta="Estado de cobros"
          valor={eur(resumen.pendienteCobro)}
          tono={resumen.pendienteCobro > 0 ? 'azul' : 'verde'}
          icono={<Wallet size={15} />}
          progreso={cobroPct}
          nota={
            <>
              Cobrado {eur0(resumen.cobrado)} ({pct(cobroPct, 0)}) · pendiente de cobro{' '}
              {eur0(resumen.pendienteCobro)}
            </>
          }
        />
      </div>

      {/* --------------------------- Fila secundaria ------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard etiqueta="Fee de servicio (20%)" valor={eur(resumen.feeServicio)} tono="cian" />
        <KpiCard
          etiqueta="IVA a liquidar"
          valor={eur(resumen.ivaLiquidar)}
          tono={resumen.ivaLiquidar >= 0 ? 'oro' : 'verde'}
          nota={<>Repercutido {eur0(resumen.ivaRepercutido)} − soportado {eur0(resumen.ivaSoportado)}</>}
        />
        <KpiCard
          etiqueta="Pendiente de liquidar a proveedores"
          valor={eur(pendienteLiquidar)}
          tono={pendienteLiquidar > 0 ? 'rojo' : 'verde'}
          icono={<Banknote size={15} />}
        />
        <KpiCard
          etiqueta="Ticket medio por operación"
          valor={eur(resumen.operaciones > 0 ? resumen.totalFacturado / resumen.operaciones : 0)}
          tono="neutro"
          nota={<>Margen medio {eur0(resumen.operaciones > 0 ? resumen.margenBruto / resumen.operaciones : 0)}</>}
        />
      </div>

      {/* ------------------------- Ranking + desglose gasto ----------------------- */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          titulo="Ranking de jugadores más rentables"
          descripcion="Ingreso facturado frente a margen generado por cliente"
          acciones={
            <select
              value={topJugadores}
              onChange={(e) => setTopJugadores(Number(e.target.value))}
              className="rounded-lg border border-borde bg-panel px-2 py-1 text-xs text-tinta-2 focus:outline-none"
              aria-label="Número de jugadores mostrados"
            >
              {[5, 8, 12, 20].map((n) => (
                <option key={n} value={n} className="bg-panel">
                  Top {n}
                </option>
              ))}
            </select>
          }
        >
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jugadoresGrafico} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
                <CartesianGrid {...REJILLA} horizontal={false} vertical />
                <XAxis type="number" {...EJE} tickFormatter={(v) => eur0(Number(v))} />
                <YAxis type="category" dataKey="nombre" width={104} {...EJE} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<TooltipCaja />}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-tinta-2)' }} />
                <Bar dataKey="Facturado" fill="var(--color-oro)" radius={[0, 4, 4, 0]} barSize={11} isAnimationActive={false} />
                <Bar dataKey="Margen" fill="var(--color-verde)" radius={[0, 4, 4, 0]} barSize={11} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          className="xl:col-span-2"
          titulo="Desglose de gasto por proveedor"
          descripcion="Reparto del coste directo entre instalaciones y colaboradores"
        >
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gastoGrafico}
                  dataKey="valor"
                  nameKey="nombre"
                  innerRadius={54}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="var(--color-lienzo)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {gastoGrafico.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipCaja />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2">
            {gastoGrafico.slice(0, 6).map((g, i) => (
              <li key={g.nombre} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: PALETA[i % PALETA.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-tinta-2">{g.nombre}</span>
                <span className="cifra shrink-0 text-tinta">{eur0(g.valor)}</span>
                <span className="cifra w-14 shrink-0 text-right text-tinta-3">{pct(g.peso, 0)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ---------------------- Oportunidades y fugas + evolucion ----------------- */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          titulo="Análisis de oportunidades y fugas"
          descripcion="Margen neto que deja cada servicio una vez pagado el proveedor"
          sinPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                  <th className="px-5 py-2.5 text-left font-medium">Servicio</th>
                  <th className="px-3 py-2.5 text-right font-medium">Ingreso</th>
                  <th className="px-3 py-2.5 text-right font-medium">Coste</th>
                  <th className="px-3 py-2.5 text-right font-medium">Margen</th>
                  <th className="px-5 py-2.5 text-right font-medium">Margen %</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => {
                  const fuga = s.margenPct < 0.25
                  return (
                    <tr key={s.key} className="border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-tinta">{SERVICIO_LABEL[s.key]}</span>
                          {fuga && (
                            <span title="Margen por debajo del 25%">
                              <AlertTriangle size={13} className="text-rojo" />
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 max-w-[190px]">
                          <Barra
                            valor={s.margenPct}
                            color={fuga ? 'var(--color-rojo)' : 'var(--color-verde)'}
                          />
                        </div>
                      </td>
                      <td className="cifra px-3 py-3 text-right text-tinta">{eur0(s.ingreso)}</td>
                      <td className="cifra px-3 py-3 text-right text-tinta-2">{eur0(s.coste)}</td>
                      <td className="cifra px-3 py-3 text-right font-medium text-tinta">{eur0(s.margen)}</td>
                      <td className="px-5 py-3 text-right">
                        <Badge tono={fuga ? 'rojo' : s.margenPct > 0.5 ? 'verde' : 'oro'}>
                          {pct(s.margenPct)}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-borde p-5 sm:grid-cols-2">
            {mejorServicio && (
              <div className="rounded-xl border border-verde/25 bg-verde/8 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-verde">Oportunidad</p>
                <p className="mt-1 text-xs leading-relaxed text-tinta-2">
                  <strong className="text-tinta">{SERVICIO_LABEL[mejorServicio.key]}</strong> es el servicio con
                  mejor margen ({pct(mejorServicio.margenPct)}). Cada 1.000 € facturados aqui dejan{' '}
                  {eur0(mejorServicio.margenPct * 1000)} de margen antes de impuestos.
                </p>
              </div>
            )}
            {peorServicio && (
              <div className="rounded-xl border border-rojo/25 bg-rojo/8 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-rojo">Fuga de margen</p>
                <p className="mt-1 text-xs leading-relaxed text-tinta-2">
                  <strong className="text-tinta">{SERVICIO_LABEL[peorServicio.key]}</strong> deja solo{' '}
                  {pct(peorServicio.margenPct)} sobre {eur0(peorServicio.ingreso)} facturados. Renegociar la
                  tarifa de proveedor o repercutir el coste al cliente.
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-2"
          titulo="Evolución mensual"
          descripcion="Facturación frente a coste directo por mes"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ left: -6, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gradFacturado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-oro)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-oro)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCoste" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-rojo)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-rojo)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...REJILLA} />
                <XAxis dataKey="periodo" {...EJE} tickFormatter={periodoCorto} />
                <YAxis {...EJE} tickFormatter={(v) => eur0(Number(v))} width={74} />
                <Tooltip content={<TooltipCaja etiquetador={(l) => periodoCorto(String(l ?? ''))} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="facturado"
                  name="Facturado"
                  stroke="var(--color-oro)"
                  fill="url(#gradFacturado)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="coste"
                  name="Coste"
                  stroke="var(--color-rojo)"
                  fill="url(#gradCoste)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ---------------------------- Cuenta de resultados ------------------------ */}
      <Panel
        titulo="Cuenta de resultados"
        descripcion={
          temporadaSel === 'todas'
            ? 'Agregado de todas las temporadas; el impuesto se calcula temporada a temporada con su propio tipo'
            : `Temporada ${temporadaSel} · impuesto de sociedades al ${pct(
                tipoImpuesto(estado.temporadas, Number(temporadaSel)),
                0,
              )}`
        }
        sinPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: 'Subtotal de servicios facturados', valor: resumen.baseImponible - resumen.feeServicio },
                { label: 'Fee de servicio', valor: resumen.feeServicio },
                { label: 'Base imponible', valor: resumen.baseImponible, fuerte: true },
                { label: 'IVA repercutido', valor: resumen.ivaRepercutido },
                { label: 'Total facturado al cliente', valor: resumen.totalFacturado, fuerte: true },
                { label: 'Base de coste de proveedores', valor: -resumen.baseCoste },
                { label: 'IVA soportado', valor: -resumen.ivaSoportado },
                { label: 'Total pagado a proveedores', valor: -resumen.totalCostesProveedores, fuerte: true },
                { label: 'Margen bruto', valor: resumen.margenBruto, destacado: true },
                { label: 'Impuesto de sociedades', valor: -resumen.impuestoSociedades },
                { label: 'Beneficio neto real', valor: resumen.beneficioNeto, destacado: true },
              ].map((fila) => (
                <tr
                  key={fila.label}
                  className={`border-b border-borde/60 last:border-0 ${
                    fila.destacado ? 'bg-oro/6' : ''
                  }`}
                >
                  <td
                    className={`px-5 py-2.5 ${
                      fila.destacado || fila.fuerte ? 'font-medium text-tinta' : 'text-tinta-2'
                    }`}
                  >
                    {fila.label}
                  </td>
                  <td
                    className={`cifra px-5 py-2.5 text-right ${
                      fila.destacado
                        ? 'text-base font-semibold text-oro'
                        : fila.valor < 0
                          ? 'text-rojo'
                          : 'text-tinta'
                    }`}
                  >
                    {eur(fila.valor)}
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
