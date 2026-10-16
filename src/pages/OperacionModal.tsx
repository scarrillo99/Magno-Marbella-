import { useEffect, useMemo, useState } from 'react'
import { Banknote, CreditCard, Info, Plus, Trash2, UserPlus } from 'lucide-react'
import {
  SERVICIO_LABEL,
  TIPOS_IVA,
  type Cliente,
  type LineaServicio,
  type Operacion,
} from '../types'
import { calcularOperacion, pagosPorProveedor, r2 } from '../lib/calc'
import { eur, pct } from '../lib/format'
import { uid } from '../lib/id'
import { useStore } from '../store/store'
import { Boton, Campo, Modal, NumeroInput, Selector, Texto } from '../components/ui'
import { ClienteModal, clienteVacio } from '../components/ClienteModal'

const OPCIONES_IVA = TIPOS_IVA.map((v) => ({
  valor: String(v),
  texto: v === 0 ? 'Sin IVA' : `${Math.round(v * 100)} %`,
}))

const lineaVacia = (ivaPct: number): LineaServicio => ({
  id: uid('lin'),
  nombre: '',
  cantidad: 1,
  tarifaVenta: 0,
  tarifaCoste: 0,
  proveedorId: null,
  ivaVentaPct: ivaPct,
  ivaCostePct: ivaPct,
})

/** Ficha completa de una operación: cabecera, líneas de servicio y resultado. */
export function OperacionModal({
  operacion,
  abierto,
  onCerrar,
}: {
  operacion: Operacion | null
  abierto: boolean
  onCerrar: () => void
}) {
  const { estado, guardarOperacion, guardarCliente } = useStore()
  const [borrador, setBorrador] = useState<Operacion | null>(operacion)
  const [clienteNuevo, setClienteNuevo] = useState<Cliente | null>(null)

  useEffect(() => {
    setBorrador(operacion)
  }, [operacion])

  const calc = useMemo(() => (borrador ? calcularOperacion(borrador) : null), [borrador])
  const pagos = useMemo(
    () => (calc ? pagosPorProveedor(calc, estado.proveedores) : []),
    [calc, estado.proveedores],
  )

  if (!borrador || !calc) return null

  const ivaTemporada = estado.temporadas.find((t) => t.year === borrador.temporada)?.ivaPct ?? 0.21
  const set = (cambios: Partial<Operacion>) => setBorrador({ ...borrador, ...cambios })

  const setLinea = (id: string, cambios: Partial<LineaServicio>) =>
    setBorrador({
      ...borrador,
      lineas: borrador.lineas.map((l) => (l.id === id ? { ...l, ...cambios } : l)),
    })

  const anadirLinea = (linea: LineaServicio) =>
    setBorrador({ ...borrador, lineas: [...borrador.lineas, linea] })

  const quitarLinea = (id: string) =>
    setBorrador({ ...borrador, lineas: borrador.lineas.filter((l) => l.id !== id) })

  const tarifasTemporada = estado.tarifas.filter((t) => t.temporada === borrador.temporada && t.activa)

  const anadirDesdeTarifario = (tarifaId: string) => {
    const t = tarifasTemporada.find((x) => x.id === tarifaId)
    if (!t) return
    anadirLinea({
      id: uid('lin'),
      nombre: t.concepto,
      cantidad: 1,
      tarifaVenta: t.tarifaVenta,
      tarifaCoste: t.tarifaCoste,
      proveedorId: t.proveedorId,
      ivaVentaPct: ivaVentaComun ?? ivaTemporada,
      ivaCostePct: ivaTemporada,
    })
  }

  /** IVA de venta si todas las líneas coinciden; `null` si están mezcladas. */
  const ivaVentaComun: number | null =
    borrador.lineas.length === 0
      ? ivaTemporada
      : borrador.lineas.every((l) => l.ivaVentaPct === borrador.lineas[0].ivaVentaPct)
        ? borrador.lineas[0].ivaVentaPct
        : null

  const aplicarIvaVentaATodas = (valor: number) =>
    setBorrador({ ...borrador, lineas: borrador.lineas.map((l) => ({ ...l, ivaVentaPct: valor })) })

  const opcionesProveedor = [
    { valor: '', texto: '— Sin proveedor —' },
    ...estado.proveedores.filter((p) => p.activo).map((p) => ({ valor: p.id, texto: p.nombre })),
  ]

  const cliente = estado.clientes.find(
    (c) => c.nombre.trim().toLowerCase() === borrador.jugador.trim().toLowerCase(),
  )
  const fichaCliente = cliente
    ? [cliente.agencia && `Agencia: ${cliente.agencia}`, cliente.club && `Club: ${cliente.club}`]
        .filter(Boolean)
        .join(' · ') || 'Cliente registrado'
    : borrador.jugador.trim()
      ? 'Sin ficha de cliente. Pulsa + para darlo de alta.'
      : undefined

  const guardar = () => {
    guardarOperacion(borrador)
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={borrador.jugador ? `Operación · ${borrador.jugador}` : 'Nueva operación'}
      descripcion={`${borrador.numeroFactura || 'Sin número'} · temporada ${borrador.temporada}`}
      ancho="max-w-7xl"
      pie={
        <>
          <span className="mr-auto text-xs text-tinta-2">
            Beneficio de la operación:{' '}
            <strong className={calc.beneficioOperativo >= 0 ? 'text-verde' : 'text-rojo'}>
              {eur(calc.beneficioOperativo)}
            </strong>{' '}
            ({pct(calc.margenPct)})
          </span>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" onClick={guardar}>
            Guardar operación
          </Boton>
        </>
      }
    >
      <div className="space-y-6">
        {/* -------------------------------- Cabecera ------------------------------ */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Nº factura / ID">
            <Texto
              value={borrador.numeroFactura}
              onChange={(e) => set({ numeroFactura: e.target.value })}
              placeholder="MM-2027-001"
            />
          </Campo>
          <Campo etiqueta="Fecha">
            <Texto type="date" value={borrador.fecha} onChange={(e) => set({ fecha: e.target.value })} />
          </Campo>
          <Campo etiqueta="Temporada">
            <Selector
              value={String(borrador.temporada)}
              onChange={(e) => set({ temporada: Number(e.target.value) })}
              opciones={estado.temporadas.map((t) => ({ valor: String(t.year), texto: String(t.year) }))}
            />
          </Campo>
          <Campo etiqueta="Jugador / cliente" ayuda={fichaCliente}>
            <div className="flex gap-1.5">
              <Texto
                value={borrador.jugador}
                onChange={(e) => set({ jugador: e.target.value })}
                placeholder="Nombre del jugador"
                list="lista-jugadores"
              />
              <button
                type="button"
                onClick={() => setClienteNuevo(clienteVacio(borrador.jugador))}
                title="Dar de alta una ficha de cliente"
                aria-label="Nuevo cliente"
                className="shrink-0 rounded-lg border border-borde px-2.5 text-tinta-3 transition-colors hover:border-oro hover:text-oro"
              >
                <UserPlus size={14} />
              </button>
            </div>
            <datalist id="lista-jugadores">
              {[
                ...new Set([
                  ...estado.clientes.filter((c) => c.activo).map((c) => c.nombre),
                  ...estado.operaciones.map((o) => o.jugador),
                ]),
              ]
                .filter(Boolean)
                .map((j) => (
                  <option key={j} value={j} />
                ))}
            </datalist>
          </Campo>
          <Campo etiqueta="Ubicación">
            <Texto
              value={borrador.ubicacion}
              onChange={(e) => set({ ubicacion: e.target.value })}
              list="lista-ubicaciones"
              placeholder="Marbella Football Center"
            />
            <datalist id="lista-ubicaciones">
              {estado.ubicaciones.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Campo>
          <Campo etiqueta="Importe cobrado">
            <NumeroInput
              valor={borrador.pagado}
              onValor={(n) => set({ pagado: n })}
              decimalesMinimos={2}
              className="campo cifra text-right"
              sufijo="€"
            />
          </Campo>
        </div>

        {/* ------------------------------ Forma de cobro -------------------------- */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-borde bg-panel-2/40 p-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-tinta-3">
            Forma de cobro
          </span>
          <div className="flex gap-1.5">
            <BotonCobro
              activo={ivaVentaComun === ivaTemporada}
              icono={<CreditCard size={13} />}
              texto={`Transferencia · con IVA ${pct(ivaTemporada, 0)}`}
              onClick={() => aplicarIvaVentaATodas(ivaTemporada)}
            />
            <BotonCobro
              activo={ivaVentaComun === 0}
              icono={<Banknote size={13} />}
              texto="Efectivo · sin IVA"
              onClick={() => aplicarIvaVentaATodas(0)}
            />
          </div>
          <span className="text-[11px] text-tinta-3">
            {ivaVentaComun === null
              ? 'Líneas con IVA distinto: revisa la columna «IVA» de cada servicio.'
              : 'Cambia el IVA de todas las líneas a la vez; cada una se puede ajustar por separado.'}
          </span>
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-2 text-[11px] text-tinta-3">
              Descuento
              <NumeroInput
                valor={borrador.descuento}
                onValor={(n) => set({ descuento: n })}
                decimalesMinimos={2}
                className="celda-edit w-full text-right"
                claseContenedor="w-28"
                sufijo="€"
                aria-label="Descuento de la operación"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] text-tinta-3">
              Fee de servicio
              <NumeroInput
                valor={r2(borrador.feePct * 100)}
                onValor={(n) => set({ feePct: n / 100 })}
                className="celda-edit w-full text-right"
                claseContenedor="w-20"
                sufijo="%"
                aria-label="Fee de servicio"
              />
            </label>
          </div>
        </div>

        {/* -------------------------- Líneas de servicio -------------------------- */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Servicios de la operación
          </h3>

          {borrador.lineas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-borde px-4 py-6 text-center text-xs text-tinta-3">
              Todavía no hay servicios. Añade uno del tarifario o créalo a mano.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-borde">
              <table className="w-full min-w-[1120px] text-sm">
                <thead>
                  <tr className="border-b border-borde bg-panel-2/60 text-[11px] uppercase tracking-wider text-tinta-3">
                    <th className="px-3 py-2 text-left font-medium">Servicio</th>
                    <th className="px-2 py-2 text-right font-medium">Cant.</th>
                    <th className="px-2 py-2 text-right font-medium">Precio cliente</th>
                    <th className="px-2 py-2 text-center font-medium">IVA</th>
                    <th className="px-2 py-2 text-right font-medium">Total cliente</th>
                    <th className="px-2 py-2 text-left font-medium">Proveedor</th>
                    <th className="px-2 py-2 text-right font-medium">Coste ud.</th>
                    <th className="px-2 py-2 text-center font-medium">IVA</th>
                    <th className="px-2 py-2 text-right font-medium">Total proveedor</th>
                    <th className="px-2 py-2 text-right font-medium">Beneficio</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {calc.lineas.map((lc) => {
                    const l = lc.linea
                    return (
                      <tr key={l.id} className="border-b border-borde/60 last:border-0">
                        <td className="px-3 py-2">
                          <input
                            value={l.nombre}
                            onChange={(e) => setLinea(l.id, { nombre: e.target.value })}
                            placeholder="Nombre del servicio"
                            list="lista-servicios"
                            className="celda-edit min-w-[172px]"
                            aria-label="Nombre del servicio"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <NumeroInput
                            valor={l.cantidad}
                            onValor={(n) => setLinea(l.id, { cantidad: n })}
                            className="celda-edit w-full text-right"
                            claseContenedor="w-16"
                            aria-label={`Cantidad de ${l.nombre || 'la línea'}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <NumeroInput
                            valor={l.tarifaVenta}
                            onValor={(n) => setLinea(l.id, { tarifaVenta: n })}
                            decimalesMinimos={2}
                            className="celda-edit w-full text-right"
                            claseContenedor="w-24"
                            aria-label={`Precio al cliente de ${l.nombre || 'la línea'}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={String(l.ivaVentaPct)}
                            onChange={(e) => setLinea(l.id, { ivaVentaPct: Number(e.target.value) })}
                            className={`celda-edit w-[86px] ${l.ivaVentaPct === 0 ? 'text-oro' : ''}`}
                            aria-label={`IVA al cliente de ${l.nombre || 'la línea'}`}
                          >
                            {OPCIONES_IVA.map((o) => (
                              <option key={o.valor} value={o.valor} className="bg-panel">
                                {o.texto}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="cifra px-2 py-2 text-right font-medium text-oro">
                          {eur(lc.totalVenta)}
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={l.proveedorId ?? ''}
                            onChange={(e) => {
                              const id = e.target.value || null
                              const prov = estado.proveedores.find((p) => p.id === id)
                              setLinea(l.id, {
                                proveedorId: id,
                                ...(prov && l.tarifaCoste === 0 ? { tarifaCoste: prov.tarifaHabitual } : {}),
                              })
                            }}
                            className="celda-edit min-w-[142px]"
                            aria-label={`Proveedor de ${l.nombre || 'la línea'}`}
                          >
                            {opcionesProveedor.map((o) => (
                              <option key={o.valor} value={o.valor} className="bg-panel">
                                {o.texto}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <NumeroInput
                            valor={l.tarifaCoste}
                            onValor={(n) => setLinea(l.id, { tarifaCoste: n })}
                            decimalesMinimos={2}
                            className="celda-edit w-full text-right"
                            claseContenedor="w-24"
                            aria-label={`Coste de proveedor de ${l.nombre || 'la línea'}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={String(l.ivaCostePct)}
                            onChange={(e) => setLinea(l.id, { ivaCostePct: Number(e.target.value) })}
                            className={`celda-edit w-[86px] ${l.ivaCostePct === 0 ? 'text-oro' : ''}`}
                            aria-label={`IVA del proveedor de ${l.nombre || 'la línea'}`}
                          >
                            {OPCIONES_IVA.map((o) => (
                              <option key={o.valor} value={o.valor} className="bg-panel">
                                {o.texto}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="cifra px-2 py-2 text-right text-rojo">{eur(lc.totalCoste)}</td>
                        <td
                          className={`cifra px-2 py-2 text-right font-medium ${
                            lc.beneficio >= 0 ? 'text-verde' : 'text-rojo'
                          }`}
                        >
                          {eur(lc.beneficio)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => quitarLinea(l.id)}
                            className="rounded p-1.5 text-tinta-3 transition-colors hover:bg-panel-2 hover:text-rojo"
                            aria-label={`Quitar ${l.nombre || 'la línea'}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <datalist id="lista-servicios">
            {[
              ...new Set([
                ...tarifasTemporada.map((t) => t.concepto),
                ...Object.values(SERVICIO_LABEL),
                ...estado.operaciones.flatMap((o) => o.lineas.map((l) => l.nombre)),
              ]),
            ]
              .filter(Boolean)
              .map((n) => (
                <option key={n} value={n} />
              ))}
          </datalist>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Selector
              value=""
              onChange={(e) => {
                anadirDesdeTarifario(e.target.value)
                e.target.value = ''
              }}
              className="w-auto"
              aria-label="Añadir servicio desde el tarifario"
              disabled={tarifasTemporada.length === 0}
              opciones={[
                {
                  valor: '',
                  texto:
                    tarifasTemporada.length === 0
                      ? `Sin tarifas para ${borrador.temporada}`
                      : 'Añadir desde el tarifario…',
                },
                ...tarifasTemporada.map((t) => ({
                  valor: t.id,
                  texto: `${t.concepto} · ${eur(t.tarifaVenta)}`,
                })),
              ]}
            />
            <Boton onClick={() => anadirLinea(lineaVacia(ivaVentaComun ?? ivaTemporada))}>
              <Plus size={13} /> Servicio manual
            </Boton>
          </div>
        </div>

        {/* --------------------- Venta / coste / resultado ------------------------ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-borde bg-panel-2/40 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-oro">
              Lo que se cobra al cliente
            </h3>
            <Fila label="Suma de servicios" valor={calc.subtotalVenta} />
            {borrador.feePct > 0 && (
              <Fila label={`Fee de servicio (${pct(borrador.feePct, 0)})`} valor={calc.fee} />
            )}
            {calc.descuento > 0 && <Fila label="Descuento" valor={-calc.descuento} tono="rojo" />}
            <Fila label="Base imponible" valor={calc.baseImponible} fuerte />
            <Fila label="IVA repercutido" valor={calc.ivaVenta} />
            <Fila label="Total a cobrar" valor={calc.totalVenta} destacado />
            <div className="my-3 border-t border-borde" />
            <Fila label="Importe cobrado" valor={calc.pagado} />
            <Fila
              label="Pendiente de cobro"
              valor={calc.resta}
              fuerte
              tono={calc.resta > 0.005 ? 'rojo' : 'verde'}
            />
          </div>

          <div className="rounded-xl border border-borde bg-panel-2/40 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-rojo">
              Lo que se paga a proveedores
            </h3>
            {pagos.length === 0 ? (
              <p className="text-xs text-tinta-3">Ninguna línea tiene coste de proveedor.</p>
            ) : (
              <ul className="space-y-2">
                {pagos.map((p) => (
                  <li key={p.proveedorId} className="border-b border-borde/60 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-tinta">{p.nombre}</span>
                      <span className="cifra text-sm font-semibold text-rojo">{eur(p.total)}</span>
                    </div>
                    <p className="text-[11px] text-tinta-3">
                      {p.conceptos.join(', ')} · base {eur(p.base)}
                      {p.iva > 0 ? ` + IVA ${eur(p.iva)}` : ' · sin IVA'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-tinta-3">
                        A cuenta
                        <NumeroInput
                          valor={borrador.pagosProveedor[p.proveedorId] ?? 0}
                          onValor={(n) =>
                            set({ pagosProveedor: { ...borrador.pagosProveedor, [p.proveedorId]: n } })
                          }
                          decimalesMinimos={2}
                          className="celda-edit w-full text-right"
                          claseContenedor="w-24"
                          sufijo="€"
                          aria-label={`Pagado a cuenta a ${p.nombre}`}
                        />
                      </label>
                      {(() => {
                        const resta = r2(p.total - (borrador.pagosProveedor[p.proveedorId] ?? 0))
                        return (
                          <span className={`cifra text-[11px] ${resta > 0.005 ? 'text-oro' : 'text-verde'}`}>
                            {resta > 0.005 ? `restan ${eur(resta)}` : 'liquidado'}
                          </span>
                        )
                      })()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 border-t border-borde pt-2">
              <Fila label="Total a proveedores" valor={calc.totalCoste} destacado tono="rojo" />
            </div>
          </div>

          <div className="rounded-xl border border-borde bg-panel-2/40 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-verde">Resultado</h3>
            <Fila label="Total cobrado al cliente" valor={calc.totalVenta} />
            <Fila label="Total pagado a proveedores" valor={-calc.totalCoste} />
            <div className="my-3 border-t border-borde" />
            <Fila
              label="Beneficio de la operación"
              valor={calc.beneficioOperativo}
              destacado
              tono={calc.beneficioOperativo >= 0 ? 'verde' : 'rojo'}
            />
            <p className="mt-1 text-xs text-tinta-2">Margen del {pct(calc.margenPct)}</p>
            <div className="my-3 border-t border-borde" />
            <Fila label="IVA repercutido" valor={calc.ivaVenta} />
            <Fila label="IVA soportado" valor={-calc.ivaCoste} />
            <Fila label="IVA a liquidar" valor={r2(calc.ivaVenta - calc.ivaCoste)} fuerte />
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-tinta-3">
              <Info size={12} className="mt-0.5 shrink-0" />
              El impuesto de sociedades no se aplica aquí: se calcula sobre el margen de toda la temporada,
              en el dashboard.
            </p>
          </div>
        </div>

        <Campo etiqueta="Notas">
          <textarea
            value={borrador.notas}
            onChange={(e) => set({ notas: e.target.value })}
            rows={2}
            className="campo resize-y"
            placeholder="Condiciones, incidencias, acuerdos con el agente…"
          />
        </Campo>
      </div>

      <ClienteModal
        cliente={clienteNuevo}
        onGuardar={(c) => {
          guardarCliente(c)
          set({ jugador: c.nombre })
          setClienteNuevo(null)
        }}
        onCerrar={() => setClienteNuevo(null)}
      />
    </Modal>
  )
}

function BotonCobro({
  activo,
  icono,
  texto,
  onClick,
}: {
  activo: boolean
  icono: React.ReactNode
  texto: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
        activo
          ? 'border-oro/40 bg-oro/12 text-oro'
          : 'border-borde text-tinta-2 hover:border-borde-fuerte hover:text-tinta'
      }`}
    >
      {icono}
      {texto}
    </button>
  )
}

function Fila({
  label,
  valor,
  fuerte = false,
  destacado = false,
  tono,
}: {
  label: string
  valor: number
  fuerte?: boolean
  destacado?: boolean
  tono?: 'verde' | 'rojo'
}) {
  const color = tono === 'verde' ? 'text-verde' : tono === 'rojo' ? 'text-rojo' : 'text-tinta'
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${destacado ? 'mt-1' : ''}`}>
      <span className={`text-xs ${fuerte || destacado ? 'text-tinta' : 'text-tinta-2'}`}>{label}</span>
      <span
        className={`cifra ${destacado ? 'text-base font-semibold' : fuerte ? 'text-sm font-medium' : 'text-sm'} ${color}`}
      >
        {eur(valor)}
      </span>
    </div>
  )
}
