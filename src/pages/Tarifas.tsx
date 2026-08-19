import { useMemo, useState } from 'react'
import { AlertTriangle, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { r2 } from '../lib/calc'
import { eur, pct } from '../lib/format'
import { uid } from '../lib/id'
import {
  SERVICIOS,
  SERVICIO_LABEL,
  SERVICIO_UNIDAD_SINGULAR,
  type ServicioKey,
  type Tarifa,
} from '../types'
import {
  Badge,
  Boton,
  Campo,
  Confirmacion,
  Modal,
  NumeroInput,
  Panel,
  Selector,
  Texto,
  Vacio,
} from '../components/ui'
import { KpiCard } from '../components/KpiCard'

/**
 * Margen unitario de una tarifa. El fee de servicio se suma sobre el precio
 * de venta, así que entra en el cálculo; el IVA no, porque se repercute y se
 * soporta al mismo tipo y no altera el margen.
 */
function margenUnitario(t: Tarifa, feePct: number) {
  const ingreso = t.tarifaVenta * (1 + feePct)
  const margen = r2(ingreso - t.tarifaCoste)
  return { ingreso: r2(ingreso), margen, margenPct: ingreso > 0 ? margen / ingreso : 0 }
}

export function Tarifas() {
  const {
    estado,
    temporadaSel,
    tarifasFiltradas,
    guardarTarifa,
    borrarTarifa,
    copiarTarifas,
  } = useStore()

  const [editando, setEditando] = useState<Tarifa | null>(null)
  const [aBorrar, setABorrar] = useState<Tarifa | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const temporadaActiva =
    temporadaSel === 'todas' ? estado.temporadas.at(-1)?.year ?? new Date().getFullYear() : temporadaSel
  const feePct = estado.temporadas.find((t) => t.year === temporadaActiva)?.feePct ?? 0.2

  const porServicio = useMemo(
    () =>
      SERVICIOS.map((servicio) => ({
        servicio,
        tarifas: tarifasFiltradas
          .filter((t) => t.servicio === servicio)
          .sort((a, b) => a.concepto.localeCompare(b.concepto, 'es')),
      })).filter((g) => g.tarifas.length > 0),
    [tarifasFiltradas],
  )

  const activas = tarifasFiltradas.filter((t) => t.activa)
  const enPerdidas = activas.filter((t) => t.tarifaVenta > 0 && t.tarifaVenta < t.tarifaCoste)
  const margenes = activas
    .filter((t) => t.tarifaVenta > 0)
    .map((t) => margenUnitario(t, feePct).margenPct)
  const margenMedio = margenes.length > 0 ? margenes.reduce((a, m) => a + m, 0) / margenes.length : 0

  const nuevaTarifa = (): Tarifa => ({
    id: uid('tar'),
    temporada: temporadaActiva,
    servicio: 'campo',
    proveedorId: null,
    concepto: '',
    tarifaVenta: 0,
    tarifaCoste: 0,
    notas: '',
    activa: true,
  })

  const otrasTemporadas = estado.temporadas.map((t) => t.year).filter((y) => y !== temporadaActiva)

  return (
    <div className="space-y-5">
      {aviso && (
        <div className="panel flex items-center justify-between gap-3 px-4 py-3 text-sm text-tinta-2">
          <span>{aviso}</span>
          <Boton variante="fantasma" onClick={() => setAviso(null)}>
            Cerrar
          </Boton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          etiqueta="Tarifas activas"
          valor={String(activas.length)}
          tono="oro"
          nota={<>{tarifasFiltradas.length - activas.length} en borrador o dadas de baja</>}
        />
        <KpiCard etiqueta="Margen unitario medio" valor={pct(margenMedio)} tono={margenMedio > 0.4 ? 'verde' : 'oro'} />
        <KpiCard
          etiqueta="Tarifas por debajo de coste"
          valor={String(enPerdidas.length)}
          tono={enPerdidas.length > 0 ? 'rojo' : 'verde'}
          icono={enPerdidas.length > 0 ? <AlertTriangle size={15} /> : undefined}
          nota={
            enPerdidas.length > 0 ? (
              <>Se vende por debajo del coste del proveedor: {enPerdidas.map((t) => t.concepto).join(', ')}</>
            ) : (
              <>Ninguna tarifa se vende por debajo del coste</>
            )
          }
        />
        <KpiCard
          etiqueta="Fee de servicio aplicado"
          valor={pct(feePct, 0)}
          tono="cian"
          nota={<>Se suma sobre el precio de venta de cada tarifa</>}
        />
      </div>

      {enPerdidas.length > 0 && (
        <div className="panel flex gap-3 border-rojo/30 bg-rojo/8 p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rojo" />
          <div className="text-xs leading-relaxed text-tinta-2">
            <strong className="text-tinta">Revisa estas tarifas antes de cerrar la temporada.</strong>{' '}
            {enPerdidas.map((t) => (
              <span key={t.id}>
                <strong className="text-tinta">{t.concepto}</strong> se vende a {eur(t.tarifaVenta)} y cuesta{' '}
                {eur(t.tarifaCoste)}: {eur(r2(t.tarifaVenta - t.tarifaCoste))} por unidad antes del fee.{' '}
              </span>
            ))}
            Solo el fee del {pct(feePct, 0)} mantiene la operación en positivo, con mucho menos margen que el
            resto de instalaciones.
          </div>
        </div>
      )}

      <Panel
        sinPadding
        titulo={`Tarifario ${temporadaSel === 'todas' ? '· todas las temporadas' : temporadaSel}`}
        descripcion="Precio de venta al cliente y coste de proveedor por servicio. Al crear una operación se eligen de aquí."
        acciones={
          <>
            {otrasTemporadas.length > 0 && temporadaSel !== 'todas' && (
              <Selector
                value=""
                onChange={(e) => {
                  const origen = Number(e.target.value)
                  if (!origen) return
                  const n = copiarTarifas(origen, temporadaActiva)
                  setAviso(
                    n === 0
                      ? `La temporada ${temporadaActiva} ya tiene todas las tarifas de ${origen}.`
                      : `${n} tarifa${n === 1 ? '' : 's'} copiada${n === 1 ? '' : 's'} de ${origen} a ${temporadaActiva}. Revisa los precios antes de usarlas.`,
                  )
                  e.target.value = ''
                }}
                className="w-auto"
                aria-label="Copiar tarifario de otra temporada"
                opciones={[
                  { valor: '', texto: 'Copiar tarifas de…' },
                  ...otrasTemporadas.map((y) => ({ valor: String(y), texto: `Temporada ${y}` })),
                ]}
              />
            )}
            <Boton variante="primario" onClick={() => setEditando(nuevaTarifa())}>
              <Plus size={13} /> Nueva tarifa
            </Boton>
          </>
        }
      >
        {porServicio.length === 0 ? (
          <Vacio
            titulo="Tarifario vacío"
            mensaje={
              temporadaSel === 'todas'
                ? 'No hay tarifas dadas de alta.'
                : `La temporada ${temporadaActiva} no tiene tarifas. Copia las de otra temporada o crea la primera.`
            }
            accion={
              <Boton variante="primario" onClick={() => setEditando(nuevaTarifa())}>
                <Plus size={13} /> Crear la primera
              </Boton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                  <th className="px-5 py-2.5 text-left font-medium">Concepto</th>
                  <th className="px-3 py-2.5 text-left font-medium">Proveedor</th>
                  {temporadaSel === 'todas' && (
                    <th className="px-3 py-2.5 text-right font-medium">Temporada</th>
                  )}
                  <th className="px-3 py-2.5 text-right font-medium">Precio cliente</th>
                  <th className="px-3 py-2.5 text-right font-medium">Coste proveedor</th>
                  <th className="px-3 py-2.5 text-right font-medium">Margen / unidad</th>
                  <th className="px-3 py-2.5 text-right font-medium">Margen %</th>
                  <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              {porServicio.map((grupo) => (
                <tbody key={grupo.servicio}>
                  <tr className="bg-panel-2/50">
                    <td
                      colSpan={temporadaSel === 'todas' ? 8 : 7}
                      className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-oro"
                    >
                      {SERVICIO_LABEL[grupo.servicio]}
                      <span className="ml-1.5 font-normal normal-case text-tinta-3">
                        precio por {SERVICIO_UNIDAD_SINGULAR[grupo.servicio]}
                      </span>
                    </td>
                  </tr>
                  {grupo.tarifas.map((t) => {
                    const m = margenUnitario(t, feePct)
                    const bajoCoste = t.tarifaVenta > 0 && t.tarifaVenta < t.tarifaCoste
                    const sinPrecio = t.tarifaVenta === 0
                    return (
                      <tr
                        key={t.id}
                        className={`group border-b border-borde/60 hover:bg-panel-2/50 ${
                          t.activa ? '' : 'opacity-55'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-tinta">{t.concepto || 'Sin concepto'}</span>
                            {!t.activa && <Badge>Inactiva</Badge>}
                            {bajoCoste && <Badge tono="rojo">Bajo coste</Badge>}
                            {sinPrecio && <Badge tono="oro">Sin precio</Badge>}
                          </div>
                          {t.notas && (
                            <span className="mt-0.5 block max-w-lg text-[11px] text-tinta-3">{t.notas}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-tinta-2">
                          {estado.proveedores.find((p) => p.id === t.proveedorId)?.nombre ?? '—'}
                        </td>
                        {temporadaSel === 'todas' && (
                          <td className="cifra px-3 py-3 text-right text-tinta-2">{t.temporada}</td>
                        )}
                        <td className="px-3 py-3">
                          <NumeroInput
                            valor={t.tarifaVenta}
                            onValor={(n) => guardarTarifa({ ...t, tarifaVenta: n })}
                            decimalesMinimos={2}
                            className="celda-edit w-full text-right"
                            claseContenedor="ml-auto w-28"
                            sufijo="€"
                            aria-label={`Precio al cliente de ${t.concepto}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <NumeroInput
                            valor={t.tarifaCoste}
                            onValor={(n) => guardarTarifa({ ...t, tarifaCoste: n })}
                            decimalesMinimos={2}
                            className="celda-edit w-full text-right"
                            claseContenedor="ml-auto w-28"
                            sufijo="€"
                            aria-label={`Coste de proveedor de ${t.concepto}`}
                          />
                        </td>
                        <td
                          className={`cifra px-3 py-3 text-right font-medium ${
                            m.margen >= 0 ? 'text-verde' : 'text-rojo'
                          }`}
                        >
                          {sinPrecio ? '—' : eur(m.margen)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {sinPrecio ? (
                            <span className="text-tinta-3">—</span>
                          ) : (
                            <Badge tono={m.margenPct < 0.2 ? 'rojo' : m.margenPct > 0.45 ? 'verde' : 'oro'}>
                              {pct(m.margenPct)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setEditando(t)}
                              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-oro"
                              aria-label={`Editar ${t.concepto}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                guardarTarifa({ ...t, id: uid('tar'), concepto: `${t.concepto} (copia)` })
                              }
                              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-azul"
                              aria-label={`Duplicar ${t.concepto}`}
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setABorrar(t)}
                              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-rojo"
                              aria-label={`Eliminar ${t.concepto}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              ))}
            </table>
          </div>
        )}
        <p className="border-t border-borde px-5 py-3 text-[11px] leading-relaxed text-tinta-3">
          El margen por unidad es <strong className="text-tinta-2">precio cliente × (1 + fee) − coste de
          proveedor</strong>. El IVA no entra: se repercute y se soporta al mismo tipo, así que no cambia el
          margen.
        </p>
      </Panel>

      <TarifaModal
        tarifa={editando}
        onGuardar={(t) => {
          guardarTarifa(t)
          setEditando(null)
        }}
        onCerrar={() => setEditando(null)}
      />

      <Confirmacion
        abierto={aBorrar !== null}
        titulo="Eliminar tarifa"
        mensaje={
          <>
            Se eliminará <strong className="text-tinta">{aBorrar?.concepto}</strong> del tarifario. Las
            operaciones ya creadas conservan los precios con los que se facturaron. Si solo quieres dejar de
            ofrecerla, márcala como inactiva desde su ficha.
          </>
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar) borrarTarifa(aBorrar.id)
          setABorrar(null)
        }}
      />
    </div>
  )
}

function TarifaModal({
  tarifa,
  onGuardar,
  onCerrar,
}: {
  tarifa: Tarifa | null
  onGuardar: (t: Tarifa) => void
  onCerrar: () => void
}) {
  const { estado } = useStore()
  const [borrador, setBorrador] = useState<Tarifa | null>(tarifa)
  const clave = tarifa?.id ?? 'ninguna'
  const [claveActual, setClaveActual] = useState(clave)
  if (claveActual !== clave) {
    setClaveActual(clave)
    setBorrador(tarifa)
  }

  if (!borrador) return null
  const set = (c: Partial<Tarifa>) => setBorrador({ ...borrador, ...c })
  const fee = estado.temporadas.find((t) => t.year === borrador.temporada)?.feePct ?? 0.2
  const m = margenUnitario(borrador, fee)

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={tarifa?.concepto ? `Tarifa · ${tarifa.concepto}` : 'Nueva tarifa'}
      descripcion={`Temporada ${borrador.temporada} · precio por ${SERVICIO_UNIDAD_SINGULAR[borrador.servicio]}`}
      ancho="max-w-2xl"
      pie={
        <>
          <span className="mr-auto text-xs text-tinta-2">
            Margen por unidad:{' '}
            <strong className={m.margen >= 0 ? 'text-verde' : 'text-rojo'}>{eur(m.margen)}</strong>{' '}
            ({pct(m.margenPct)})
          </span>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" disabled={!borrador.concepto.trim()} onClick={() => onGuardar(borrador)}>
            Guardar tarifa
          </Boton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Concepto" className="sm:col-span-2">
          <Texto
            value={borrador.concepto}
            onChange={(e) => set({ concepto: e.target.value })}
            placeholder="Campo 11 · Marbella Football Center"
          />
        </Campo>
        <Campo etiqueta="Servicio">
          <Selector
            value={borrador.servicio}
            onChange={(e) => set({ servicio: e.target.value as ServicioKey })}
            opciones={SERVICIOS.map((k) => ({ valor: k, texto: SERVICIO_LABEL[k] }))}
          />
        </Campo>
        <Campo etiqueta="Temporada">
          <Selector
            value={String(borrador.temporada)}
            onChange={(e) => set({ temporada: Number(e.target.value) })}
            opciones={estado.temporadas.map((t) => ({ valor: String(t.year), texto: String(t.year) }))}
          />
        </Campo>
        <Campo etiqueta="Proveedor" className="sm:col-span-2">
          <Selector
            value={borrador.proveedorId ?? ''}
            onChange={(e) => {
              const id = e.target.value || null
              const prov = estado.proveedores.find((p) => p.id === id)
              set({
                proveedorId: id,
                ...(prov && borrador.tarifaCoste === 0 ? { tarifaCoste: prov.tarifaHabitual } : {}),
              })
            }}
            opciones={[
              { valor: '', texto: '— Sin proveedor —' },
              ...estado.proveedores.filter((p) => p.activo).map((p) => ({ valor: p.id, texto: p.nombre })),
            ]}
          />
        </Campo>
        <Campo etiqueta="Precio al cliente" ayuda={`Sin fee ni IVA; el fee del ${pct(fee, 0)} se suma después`}>
          <NumeroInput
            valor={borrador.tarifaVenta}
            onValor={(n) => set({ tarifaVenta: n })}
            decimalesMinimos={2}
            className="campo cifra text-right"
            sufijo="€"
          />
        </Campo>
        <Campo etiqueta="Coste del proveedor" ayuda="Sin IVA">
          <NumeroInput
            valor={borrador.tarifaCoste}
            onValor={(n) => set({ tarifaCoste: n })}
            decimalesMinimos={2}
            className="campo cifra text-right"
            sufijo="€"
          />
        </Campo>
        <Campo etiqueta="Notas" className="sm:col-span-2">
          <textarea
            value={borrador.notas}
            onChange={(e) => set({ notas: e.target.value })}
            rows={2}
            className="campo resize-y"
            placeholder="Condiciones, franja horaria, mínimo de horas…"
          />
        </Campo>
        <label className="flex items-center gap-2 text-sm text-tinta-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={borrador.activa}
            onChange={(e) => set({ activa: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-oro)]"
          />
          Tarifa activa (se ofrece al crear operaciones)
        </label>
      </div>
    </Modal>
  )
}
