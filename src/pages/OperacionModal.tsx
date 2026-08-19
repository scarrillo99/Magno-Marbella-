import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import {
  SERVICIOS,
  SERVICIO_LABEL,
  SERVICIO_UNIDAD,
  type LineaServicio,
  type Operacion,
  type ServicioKey,
} from '../types'
import { calcularOperacion, r2 } from '../lib/calc'
import { eur, pct } from '../lib/format'
import { useStore } from '../store/store'
import { Boton, Campo, Modal, NumeroInput, Selector, Texto } from '../components/ui'

/** Ficha completa de una operación: cabecera, líneas de servicio, venta, cobro y coste. */
export function OperacionModal({
  operacion,
  abierto,
  onCerrar,
}: {
  operacion: Operacion | null
  abierto: boolean
  onCerrar: () => void
}) {
  const { estado, guardarOperacion } = useStore()
  const [borrador, setBorrador] = useState<Operacion | null>(operacion)

  useEffect(() => {
    setBorrador(operacion)
  }, [operacion])

  const calc = useMemo(() => (borrador ? calcularOperacion(borrador) : null), [borrador])

  if (!borrador || !calc) return null

  const set = (cambios: Partial<Operacion>) => setBorrador({ ...borrador, ...cambios })

  const setLinea = (key: ServicioKey, cambios: Partial<LineaServicio>) =>
    setBorrador({
      ...borrador,
      servicios: { ...borrador.servicios, [key]: { ...borrador.servicios[key], ...cambios } },
    })

  const opcionesProveedor = [
    { valor: '', texto: '— Sin proveedor —' },
    ...estado.proveedores
      .filter((p) => p.activo)
      .map((p) => ({ valor: p.id, texto: p.nombre })),
  ]

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
      ancho="max-w-5xl"
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
              placeholder="MM-2026-001"
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
          <Campo etiqueta="Jugador / cliente">
            <Texto
              value={borrador.jugador}
              onChange={(e) => set({ jugador: e.target.value })}
              placeholder="Nombre del jugador"
              list="lista-jugadores"
            />
            <datalist id="lista-jugadores">
              {[...new Set(estado.operaciones.map((o) => o.jugador))].filter(Boolean).map((j) => (
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
              className="campo cifra text-right"
              sufijo="€"
            />
          </Campo>
        </div>

        {/* -------------------------- Líneas de servicio -------------------------- */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Desglose de servicios
          </h3>
          <div className="overflow-x-auto rounded-xl border border-borde">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-borde bg-panel-2/60 text-[11px] uppercase tracking-wider text-tinta-3">
                  <th className="px-3 py-2 text-left font-medium">Servicio</th>
                  <th className="px-2 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-2 py-2 text-right font-medium">Tarifa cliente</th>
                  <th className="px-2 py-2 text-right font-medium">Subtotal venta</th>
                  <th className="px-2 py-2 text-left font-medium">Proveedor</th>
                  <th className="px-2 py-2 text-right font-medium">Tarifa proveedor</th>
                  <th className="px-2 py-2 text-right font-medium">Subtotal coste</th>
                  <th className="px-3 py-2 text-right font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {SERVICIOS.map((key) => {
                  const linea = borrador.servicios[key]
                  const d = calc.servicios.find((s) => s.key === key)!
                  const vacia = linea.cantidad === 0
                  return (
                    <tr
                      key={key}
                      className={`border-b border-borde/60 last:border-0 ${vacia ? 'opacity-55' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <span className="text-tinta">{SERVICIO_LABEL[key]}</span>
                        <span className="ml-1 text-[11px] text-tinta-3">({SERVICIO_UNIDAD[key]})</span>
                      </td>
                      <td className="px-2 py-2">
                        <NumeroInput
                          valor={linea.cantidad}
                          onValor={(n) => setLinea(key, { cantidad: n })}
                          className="celda-edit text-right"
                          aria-label={`Cantidad de ${SERVICIO_LABEL[key]}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <NumeroInput
                          valor={linea.tarifaVenta}
                          onValor={(n) => setLinea(key, { tarifaVenta: n })}
                          className="celda-edit text-right"
                          aria-label={`Tarifa cliente de ${SERVICIO_LABEL[key]}`}
                        />
                      </td>
                      <td className="cifra px-2 py-2 text-right text-tinta">{eur(d.subtotalVenta)}</td>
                      <td className="px-2 py-2">
                        <select
                          value={linea.proveedorId ?? ''}
                          onChange={(e) => {
                            const id = e.target.value || null
                            const prov = estado.proveedores.find((p) => p.id === id)
                            setLinea(key, {
                              proveedorId: id,
                              // Al asignar proveedor sin tarifa fijada, proponemos la habitual.
                              ...(prov && linea.tarifaCoste === 0
                                ? { tarifaCoste: prov.tarifaHabitual }
                                : {}),
                            })
                          }}
                          className="celda-edit min-w-[150px]"
                          aria-label={`Proveedor de ${SERVICIO_LABEL[key]}`}
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
                          valor={linea.tarifaCoste}
                          onValor={(n) => setLinea(key, { tarifaCoste: n })}
                          className="celda-edit text-right"
                          aria-label={`Tarifa proveedor de ${SERVICIO_LABEL[key]}`}
                        />
                      </td>
                      <td className="cifra px-2 py-2 text-right text-tinta-2">{eur(d.subtotalCoste)}</td>
                      <td
                        className={`cifra px-3 py-2 text-right font-medium ${
                          d.margen >= 0 ? 'text-verde' : 'text-rojo'
                        }`}
                      >
                        {eur(d.margen)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------ Venta / cobro / coste ------------------------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-borde bg-panel-2/40 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-oro">Venta al cliente</h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Campo etiqueta="Fee servicio %">
                <NumeroInput
                  valor={r2(borrador.feePct * 100)}
                  onValor={(n) => set({ feePct: n / 100 })}
                  className="campo cifra text-right"
                  sufijo="%"
                />
              </Campo>
              <Campo etiqueta="IVA venta %">
                <NumeroInput
                  valor={r2(borrador.ivaVentaPct * 100)}
                  onValor={(n) => set({ ivaVentaPct: n / 100 })}
                  className="campo cifra text-right"
                  sufijo="%"
                />
              </Campo>
            </div>
            <Fila label="Subtotal venta" valor={calc.subtotalVenta} />
            <Fila label={`Fee servicio (${pct(borrador.feePct, 0)})`} valor={calc.fee} />
            <Fila label="Base imponible" valor={calc.baseImponible} fuerte />
            <Fila label={`IVA (${pct(borrador.ivaVentaPct, 0)})`} valor={calc.ivaVenta} />
            <Fila label="Total venta" valor={calc.totalVenta} destacado />
          </div>

          <div className="rounded-xl border border-borde bg-panel-2/40 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-rojo">
              Coste de proveedores
            </h3>
            <div className="mb-3">
              <Campo etiqueta="IVA soportado %">
                <NumeroInput
                  valor={r2(borrador.ivaCostePct * 100)}
                  onValor={(n) => set({ ivaCostePct: n / 100 })}
                  className="campo cifra text-right"
                  sufijo="%"
                />
              </Campo>
            </div>
            <Fila label="Base de coste" valor={calc.baseCoste} fuerte />
            <Fila label={`IVA (${pct(borrador.ivaCostePct, 0)})`} valor={calc.ivaCoste} />
            <Fila label="Total coste proveedores" valor={calc.totalCoste} destacado tono="rojo" />
          </div>

          <div className="rounded-xl border border-borde bg-panel-2/40 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-verde">
              Cobro y resultado
            </h3>
            <Fila label="Total a cobrar" valor={calc.totalVenta} />
            <Fila label="Importe pagado" valor={calc.pagado} />
            <Fila label="Resta pendiente" valor={calc.resta} fuerte tono={calc.resta > 0 ? 'rojo' : 'verde'} />
            <div className="my-3 border-t border-borde" />
            <Fila
              label="Beneficio operativo"
              valor={calc.beneficioOperativo}
              destacado
              tono={calc.beneficioOperativo >= 0 ? 'verde' : 'rojo'}
            />
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-tinta-3">
              <Info size={12} className="mt-0.5 shrink-0" />
              Total venta menos total pagado a proveedores. El impuesto de sociedades se aplica de forma
              agregada por temporada en el dashboard.
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
    </Modal>
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
