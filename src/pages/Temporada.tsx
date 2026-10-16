import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarClock, Info, Repeat, TrendingUp } from 'lucide-react'
import { useStore } from '../store/store'
import {
  calcularOperacion,
  r2,
  estacionalidadPorDia,
  estacionalidadPorMes,
  recurrenciaClientes,
  resultadoTemporada,
} from '../lib/calc'
import { eur, eur0, fechaCorta, hoyISO, pct } from '../lib/format'
import { Badge, Barra, Panel, Vacio } from '../components/ui'
import { KpiCard } from '../components/KpiCard'
import { EJE, REJILLA, TooltipCaja } from '../components/graficos'

export function Temporada() {
  const { estado, temporadaSel, operacionesFiltradas, emitidasFiltradas, recibidasFiltradas } = useStore()

  const calculadas = useMemo(() => operacionesFiltradas.map(calcularOperacion), [operacionesFiltradas])

  const impuestoPct =
    temporadaSel === 'todas'
      ? (estado.temporadas.at(-1)?.impuestoPct ?? 0.25)
      : (estado.temporadas.find((t) => t.year === temporadaSel)?.impuestoPct ?? 0.25)

  const resultado = useMemo(
    () =>
      resultadoTemporada(
        emitidasFiltradas,
        recibidasFiltradas,
        estado.categoriasGasto,
        estado.categoriasDirectas,
        estado.repartoCompartidoPct,
        impuestoPct,
      ),
    [emitidasFiltradas, recibidasFiltradas, estado, impuestoPct],
  )

  const meses = useMemo(
    () => estacionalidadPorMes(emitidasFiltradas, calculadas),
    [emitidasFiltradas, calculadas],
  )
  const dias = useMemo(() => estacionalidadPorDia(calculadas), [calculadas])
  const recurrencia = useMemo(
    () => recurrenciaClientes(calculadas, emitidasFiltradas, hoyISO()),
    [calculadas, emitidasFiltradas],
  )

  // Las facturas llevan fecha real; las operaciones pueden tener fechas
  // aproximadas, así que mandan las facturas cuando las hay.
  const hayFacturas = meses.some((m) => m.ingresos > 0)
  const peso = (m: (typeof meses)[number]) => (hayFacturas ? m.ingresos : m.actividad)
  const mesesConDato = meses.filter((m) => peso(m) > 0)
  const maxMes = Math.max(1, ...meses.map((m) => Math.max(m.ingresos, m.actividad)))
  const mejorMes = [...mesesConDato].sort((a, b) => peso(b) - peso(a))[0]
  const diasConDato = dias.filter((d) => d.operaciones > 0)
  const mejorDia = [...diasConDato].sort((a, b) => b.importe - a.importe)[0]
  const repetidores = recurrencia.filter((r) => r.operaciones + r.facturas > 1)

  const declarada =
    temporadaSel === 'todas'
      ? null
      : (estado.facturacionDeclarada.find((f) => f.temporada === temporadaSel) ?? null)

  const hayDatos = resultado.ingresos > 0 || calculadas.length > 0

  if (!hayDatos) {
    return (
      <Panel>
        <Vacio
          titulo="Temporada sin datos"
          mensaje="No hay facturas ni operaciones en la temporada seleccionada. Cambia el filtro o importa la hoja desde Ajustes."
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      {/* ------------------- Conciliación con la hoja de control ------------------ */}
      {declarada && (
        <Panel
          titulo="La hoja de control dice otra cosa"
          descripcion={`Facturación declarada en ${declarada.fuente}`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-oro/30 bg-oro/8 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-oro">Según la hoja</p>
              <p className="cifra mt-1 text-xl font-semibold text-tinta">{eur(declarada.base)}</p>
              <p className="text-[11px] text-tinta-2">
                de base, sin IVA · {eur(declarada.total)} con IVA · {declarada.operaciones} operaciones
              </p>
            </div>
            <div className="rounded-xl border border-borde bg-panel-2/40 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-tinta-3">
                Cargado en la aplicación
              </p>
              <p className="cifra mt-1 text-xl font-semibold text-tinta">{eur(resultado.ingresos)}</p>
              <p className="text-[11px] text-tinta-2">de base, del libro de IVA</p>
            </div>
            <div className="rounded-xl border border-rojo/30 bg-rojo/8 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-rojo">Falta por cargar</p>
              <p className="cifra mt-1 text-xl font-semibold text-tinta">
                {eur(r2(declarada.base - resultado.ingresos))}
              </p>
              <p className="text-[11px] text-tinta-2">
                {pct(1 - resultado.ingresos / declarada.base, 0)} de la temporada
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-tinta-2">{declarada.notas}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-tinta-3">
            De las {declarada.operaciones} filas de la hoja, {declarada.filasSinIva} se cobraron sin IVA
            ({eur(declarada.baseSinIva)}): son las de efectivo. Hasta que no se importen todas desde Ajustes,
            el resultado de abajo solo refleja la parte que hay cargada.
          </p>
        </Panel>
      )}

      {/* ------------------------- Resultado de la temporada --------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          etiqueta="Ingresos de la temporada"
          valor={eur(resultado.ingresos)}
          tono="oro"
          nota={<>Base imponible facturada, sin IVA</>}
        />
        <KpiCard
          etiqueta="Resultado antes de impuestos"
          valor={eur(resultado.resultadoAntesImpuestos)}
          tono="cian"
          progreso={resultado.ingresos > 0 ? resultado.resultadoAntesImpuestos / resultado.ingresos : 0}
        />
        <KpiCard
          etiqueta={`Impuesto de sociedades (${pct(impuestoPct, 0)})`}
          valor={eur(resultado.impuesto)}
          tono="violeta"
        />
        <KpiCard
          etiqueta="Neto real de la temporada"
          valor={eur(resultado.neto)}
          tono={resultado.neto >= 0 ? 'verde' : 'rojo'}
          destacado
          nota={<>{pct(resultado.netoPct)} de cada euro facturado</>}
        />
      </div>

      <Panel
        sinPadding
        titulo="Cuenta de resultados real"
        descripcion="Sobre base imponible: el IVA se repercute y se soporta, se liquida con Hacienda y no es ni ingreso ni gasto"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <FilaResultado label="Ingresos facturados" valor={resultado.ingresos} fuerte />
              <FilaResultado label="Costes directos del servicio" valor={-resultado.costesDirectos} />
              {resultado.detalleDirectos.map((d) => (
                <FilaResultado key={d.etiqueta} label={d.etiqueta} valor={-d.importe} sangria />
              ))}
              <FilaResultado label="Margen bruto" valor={resultado.margenBruto} fuerte />
              <FilaResultado label="Otros gastos de estructura" valor={-resultado.otrosGastos} />
              {resultado.detalleOtros.map((d) => (
                <FilaResultado key={d.etiqueta} label={d.etiqueta} valor={-d.importe} sangria />
              ))}
              <FilaResultado
                label="Resultado antes de impuestos"
                valor={resultado.resultadoAntesImpuestos}
                destacado
              />
              <FilaResultado
                label={`Impuesto de sociedades (${pct(impuestoPct, 0)})`}
                valor={-resultado.impuesto}
              />
              <FilaResultado label="Neto real de la temporada" valor={resultado.neto} destacado />
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-1.5 border-t border-borde px-5 py-3 text-[11px] leading-relaxed text-tinta-3">
          <Info size={12} className="mt-0.5 shrink-0" />
          Los gastos compartidos con la agencia entran al {pct(estado.repartoCompartidoPct, 0)} configurado en
          Facturación. La retención de IRPF no es un gasto aparte: ya está dentro del coste del profesional, solo
          que se ingresa en Hacienda en vez de pagársela a él.
        </p>
      </Panel>

      {/* ------------------------------ Estacionalidad --------------------------- */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          titulo="Temporada alta por mes"
          descripcion="La barra dorada es facturación real; la cian, actividad de las operaciones registradas"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses} margin={{ left: -6, right: 8, top: 8 }}>
                <CartesianGrid {...REJILLA} />
                <XAxis dataKey="etiqueta" {...EJE} />
                <YAxis {...EJE} tickFormatter={(v) => eur0(Number(v))} width={74} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<TooltipCaja />} />
                <Bar dataKey="ingresos" name="Facturado" fill="var(--color-oro)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="actividad" name="Actividad" fill="var(--color-cian)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {mejorMes && (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-tinta-2">
              <TrendingUp size={13} className="mt-0.5 shrink-0 text-verde" />
              El mes más fuerte es <strong className="mx-1 text-tinta">{mejorMes.etiqueta}</strong>. La
              temporada se concentra en {mesesConDato.length} mes
              {mesesConDato.length === 1 ? '' : 'es'} ({mesesConDato.map((m) => m.etiqueta).join(', ')}): fuera
              de ahí la estructura sigue costando lo mismo.{' '}
              {hayFacturas
                ? 'Medido sobre la fecha de cada factura emitida.'
                : 'Medido sobre la fecha de cada operación.'}
            </p>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          titulo="Días de la semana"
          descripcion="Según la fecha de cada operación registrada"
        >
          {diasConDato.length === 0 ? (
            <Vacio
              titulo="Sin fechas de servicio"
              mensaje="El reparto por día sale de las operaciones. Importa la hoja «MAGNO ENTRENOS» desde Ajustes para tener las fechas reales de cada bloque."
            />
          ) : (
            <>
              <ul className="space-y-2.5">
                {dias.map((d) => {
                  const max = Math.max(1, ...dias.map((x) => x.importe))
                  const esMejor = mejorDia?.dia === d.dia
                  return (
                    <li key={d.dia}>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className={esMejor ? 'font-medium text-tinta' : 'text-tinta-2'}>
                          {d.etiqueta}
                        </span>
                        <span className="cifra text-tinta-3">
                          {d.operaciones} op · {eur0(d.importe)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Barra
                          valor={d.importe / max}
                          color={esMejor ? 'var(--color-verde)' : 'var(--color-azul)'}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
              {diasConDato.length < 3 ? (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-oro/30 bg-oro/8 p-3 text-[11px] leading-relaxed text-tinta-2">
                  <Info size={12} className="mt-0.5 shrink-0 text-oro" />
                  Con {calculadas.length} operación{calculadas.length === 1 ? '' : 'es'} repartidas en{' '}
                  {diasConDato.length} día{diasConDato.length === 1 ? '' : 's'} distintos, este reparto no dice
                  nada todavía. Importa la hoja «MAGNO ENTRENOS» desde Ajustes: cada bloque trae sus fechas
                  reales y entonces sí se ve qué días se llenan.
                </p>
              ) : (
                mejorDia && (
                  <p className="mt-3 text-[11px] leading-relaxed text-tinta-3">
                    El día con más carga es <strong className="text-tinta-2">{mejorDia.etiqueta}</strong>. Si
                    las operaciones se registran con la fecha del bloque completo, este reparto indica el día de
                    entrada, no la ocupación diaria real.
                  </p>
                )
              )}
            </>
          )}
        </Panel>
      </div>

      {/* ------------------------- Recurrencia de clientes ----------------------- */}
      <Panel
        sinPadding
        titulo="Clientes: quién repite y cuándo vino por última vez"
        descripcion="Cruza las operaciones registradas con las facturas emitidas"
        acciones={
          <Badge tono={repetidores.length > 0 ? 'verde' : 'neutro'}>
            <Repeat size={11} className="mr-1" />
            {repetidores.length} repiten
          </Badge>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                <th className="px-5 py-2.5 text-left font-medium">Cliente</th>
                <th className="px-3 py-2.5 text-right font-medium">Veces</th>
                <th className="px-3 py-2.5 text-left font-medium">Primera vez</th>
                <th className="px-3 py-2.5 text-left font-medium">Última vez</th>
                <th className="px-3 py-2.5 text-right font-medium">Hace</th>
                <th className="px-5 py-2.5 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {recurrencia.map((r) => {
                const veces = r.operaciones + r.facturas
                return (
                  <tr key={r.cliente} className="border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-tinta">{r.cliente}</span>
                      <span className="mt-0.5 block text-[11px] text-tinta-3">
                        {r.operaciones > 0 && `${r.operaciones} operación${r.operaciones === 1 ? '' : 'es'}`}
                        {r.operaciones > 0 && r.facturas > 0 && ' · '}
                        {r.facturas > 0 && `${r.facturas} factura${r.facturas === 1 ? '' : 's'}`}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Badge tono={veces > 2 ? 'verde' : veces > 1 ? 'oro' : 'neutro'}>{veces}</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-tinta-2">{fechaCorta(r.primera)}</td>
                    <td className="px-3 py-3 text-xs text-tinta">{fechaCorta(r.ultima)}</td>
                    <td className="cifra px-3 py-3 text-right text-xs">
                      {r.diasDesde === null ? (
                        <span className="text-tinta-3">—</span>
                      ) : (
                        <span className={r.diasDesde > 365 ? 'text-rojo' : r.diasDesde > 180 ? 'text-oro' : 'text-tinta-2'}>
                          {r.diasDesde} días
                        </span>
                      )}
                    </td>
                    <td className="cifra px-5 py-3 text-right font-medium text-oro">{eur(r.importe)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-1.5 border-t border-borde px-5 py-3 text-[11px] leading-relaxed text-tinta-3">
          <CalendarClock size={12} className="mt-0.5 shrink-0" />
          «Hace» se cuenta desde hoy. Muchas facturas van a nombre de la agencia o la sociedad que representa al
          jugador, así que un mismo jugador puede aparecer con dos nombres: unifícalos en la ficha de cliente
          para que la recurrencia salga bien.
        </p>
      </Panel>

      {/* ----------------------------- Mapa de meses ----------------------------- */}
      <Panel
        titulo="Calendario de la temporada"
        descripcion="Intensidad de cada mes para planificar instalaciones y personal"
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {meses.map((m) => {
            const intensidad = Math.max(m.ingresos, m.actividad) / maxMes
            return (
              <div
                key={m.mes}
                className="rounded-lg border border-borde p-2 text-center"
                style={{
                  background:
                    intensidad > 0
                      ? `color-mix(in srgb, var(--color-oro) ${Math.round(intensidad * 55)}%, transparent)`
                      : undefined,
                }}
                title={`${m.etiqueta}: ${eur(m.ingresos)} facturados`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-tinta-2">{m.etiqueta}</p>
                <p className="cifra mt-1 text-xs text-tinta">
                  {intensidad > 0 ? eur0(Math.max(m.ingresos, m.actividad)) : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function FilaResultado({
  label,
  valor,
  fuerte = false,
  destacado = false,
  sangria = false,
}: {
  label: string
  valor: number
  fuerte?: boolean
  destacado?: boolean
  sangria?: boolean
}) {
  return (
    <tr className={`border-b border-borde/60 last:border-0 ${destacado ? 'bg-oro/6' : ''}`}>
      <td
        className={`py-2.5 pr-5 ${sangria ? 'pl-10 text-xs text-tinta-3' : 'pl-5'} ${
          destacado || fuerte ? 'font-medium text-tinta' : 'text-tinta-2'
        }`}
      >
        {label}
      </td>
      <td
        className={`cifra px-5 py-2.5 text-right ${
          destacado
            ? 'text-base font-semibold text-oro'
            : sangria
              ? 'text-xs text-tinta-3'
              : valor < 0
                ? 'text-rojo'
                : 'text-tinta'
        }`}
      >
        {eur(valor)}
      </td>
    </tr>
  )
}
