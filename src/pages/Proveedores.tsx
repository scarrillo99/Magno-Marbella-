import { useMemo, useState } from 'react'
import { Check, Clock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { agruparPorProveedor, calcularOperacion, r2 } from '../lib/calc'
import { eur, eur0, fechaCorta, hoyISO, pct } from '../lib/format'
import { uid } from '../lib/id'
import { TIPO_PROVEEDOR_LABEL, type Liquidacion, type Proveedor, type TipoProveedor } from '../types'
import { Badge, Barra, Boton, Campo, Confirmacion, Modal, NumeroInput, Panel, Selector, Texto, Vacio } from '../components/ui'
import { KpiCard } from '../components/KpiCard'

const TIPOS = Object.entries(TIPO_PROVEEDOR_LABEL).map(([valor, texto]) => ({ valor, texto }))

export function Proveedores() {
  const {
    estado,
    temporadaSel,
    operacionesFiltradas,
    liquidacionesFiltradas,
    guardarProveedor,
    borrarProveedor,
    guardarLiquidacion,
    borrarLiquidacion,
  } = useStore()

  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [editandoLiq, setEditandoLiq] = useState<Liquidacion | null>(null)
  const [aBorrar, setABorrar] = useState<Proveedor | null>(null)

  const filas = useMemo(
    () => agruparPorProveedor(operacionesFiltradas.map(calcularOperacion), estado, liquidacionesFiltradas),
    [operacionesFiltradas, estado, liquidacionesFiltradas],
  )

  const costeTotal = filas.reduce((a, f) => a + f.coste, 0)
  // Pagado y pendiente salen de las propias operaciones mas las liquidaciones
  // sueltas; las filas ya traen las dos fuentes sumadas.
  const pendienteTotal = r2(filas.reduce((a, f) => a + f.pendienteLiquidar, 0))
  const liquidadoTotal = r2(filas.reduce((a, f) => a + f.liquidado, 0))
  const pendienteLiquidaciones = r2(
    liquidacionesFiltradas.filter((l) => l.estado === 'pendiente').reduce((a, l) => a + l.importe, 0),
  )
  const liquidadoLiquidaciones = r2(
    liquidacionesFiltradas.filter((l) => l.estado === 'pagada').reduce((a, l) => a + l.importe, 0),
  )

  const nuevoProveedor = (): Proveedor => ({
    id: uid('prov'),
    nombre: '',
    tipo: 'otro',
    contacto: '',
    tarifaHabitual: 0,
    cif: '',
    notas: '',
    activo: true,
  })

  const nuevaLiquidacion = (): Liquidacion => ({
    id: uid('liq'),
    proveedorId: estado.proveedores[0]?.id ?? '',
    fecha: hoyISO(),
    temporada:
      temporadaSel === 'todas' ? estado.temporadas.at(-1)?.year ?? new Date().getFullYear() : temporadaSel,
    concepto: '',
    importe: 0,
    estado: 'pendiente',
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard etiqueta="Coste directo imputado" valor={eur(costeTotal)} tono="rojo" />
        <KpiCard etiqueta="Liquidado a proveedores" valor={eur(liquidadoTotal)} tono="verde" />
        <KpiCard
          etiqueta="Pendiente de liquidar"
          valor={eur(pendienteTotal)}
          tono={pendienteTotal > 0 ? 'oro' : 'verde'}
        />
        <KpiCard
          etiqueta="Proveedores activos"
          valor={String(estado.proveedores.filter((p) => p.activo).length)}
          tono="azul"
          nota={<>{estado.proveedores.length} dados de alta en total</>}
        />
      </div>

      {/* ------------------------------ Proveedores ------------------------------ */}
      <Panel
        sinPadding
        titulo="Proveedores y colaboradores"
        descripcion="Coste imputado desde las operaciones de la temporada en vista"
        acciones={
          <Boton variante="primario" onClick={() => setEditando(nuevoProveedor())}>
            <Plus size={13} /> Nuevo proveedor
          </Boton>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                <th className="px-5 py-2.5 text-left font-medium">Proveedor</th>
                <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
                <th className="px-3 py-2.5 text-right font-medium">Tarifa habitual</th>
                <th className="px-3 py-2.5 text-right font-medium">Coste imputado</th>
                <th className="px-3 py-2.5 text-right font-medium">Peso</th>
                <th className="px-3 py-2.5 text-right font-medium">Liquidado</th>
                <th className="px-3 py-2.5 text-right font-medium">Pendiente</th>
                <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estado.proveedores.map((p) => {
                const fila = filas.find((f) => f.proveedorId === p.id)
                return (
                  <tr key={p.id} className="group border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${p.activo ? 'text-tinta' : 'text-tinta-3 line-through'}`}>
                          {p.nombre || 'Sin nombre'}
                        </span>
                        {!p.activo && <Badge>Inactivo</Badge>}
                      </div>
                      <span className="mt-0.5 block text-[11px] text-tinta-3">
                        {p.contacto || 'Sin contacto'} {p.cif && `· ${p.cif}`}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tono="azul">{TIPO_PROVEEDOR_LABEL[p.tipo]}</Badge>
                    </td>
                    <td className="cifra px-3 py-3 text-right text-tinta-2">{eur(p.tarifaHabitual)}</td>
                    <td className="cifra px-3 py-3 text-right font-medium text-rojo">
                      {eur(fila?.coste ?? 0)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="ml-auto w-20">
                        <Barra valor={fila?.pesoPct ?? 0} color="var(--color-rojo)" />
                      </div>
                      <span className="cifra mt-1 block text-right text-[11px] text-tinta-3">
                        {pct(fila?.pesoPct ?? 0, 0)}
                      </span>
                    </td>
                    <td className="cifra px-3 py-3 text-right text-verde">{eur(fila?.liquidado ?? 0)}</td>
                    <td
                      className={`cifra px-3 py-3 text-right ${
                        (fila?.pendienteLiquidar ?? 0) > 0 ? 'text-oro' : 'text-tinta-3'
                      }`}
                    >
                      {eur(fila?.pendienteLiquidar ?? 0)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditando(p)}
                          className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-oro"
                          aria-label={`Editar ${p.nombre}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setABorrar(p)}
                          className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-rojo"
                          aria-label={`Eliminar ${p.nombre}`}
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
      </Panel>

      {/* ----------------------------- Liquidaciones ----------------------------- */}
      <Panel
        sinPadding
        titulo="Liquidaciones y pagos a colaboradores"
        descripcion="Registro de pagos realizados y pendientes por proveedor"
        acciones={
          <Boton variante="primario" onClick={() => setEditandoLiq(nuevaLiquidacion())}>
            <Plus size={13} /> Nueva liquidación
          </Boton>
        }
      >
        {liquidacionesFiltradas.length === 0 ? (
          <Vacio
            titulo="Sin liquidaciones"
            mensaje="No hay pagos registrados en la temporada seleccionada."
            accion={
              <Boton variante="primario" onClick={() => setEditandoLiq(nuevaLiquidacion())}>
                <Plus size={13} /> Registrar la primera
              </Boton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                  <th className="px-5 py-2.5 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium">Proveedor</th>
                  <th className="px-3 py-2.5 text-left font-medium">Concepto</th>
                  <th className="px-3 py-2.5 text-right font-medium">Importe</th>
                  <th className="px-3 py-2.5 text-center font-medium">Estado</th>
                  <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...liquidacionesFiltradas]
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((l) => {
                    const prov = estado.proveedores.find((p) => p.id === l.proveedorId)
                    const pagada = l.estado === 'pagada'
                    return (
                      <tr key={l.id} className="group border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                        <td className="px-5 py-3 text-tinta-2">{fechaCorta(l.fecha)}</td>
                        <td className="px-3 py-3 text-tinta">{prov?.nombre ?? 'Proveedor eliminado'}</td>
                        <td className="px-3 py-3 text-xs text-tinta-2">{l.concepto || '—'}</td>
                        <td className="cifra px-3 py-3 text-right font-medium text-tinta">{eur(l.importe)}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              guardarLiquidacion({ ...l, estado: pagada ? 'pendiente' : 'pagada' })
                            }
                            title="Cambiar estado"
                            className="inline-flex"
                          >
                            <Badge tono={pagada ? 'verde' : 'oro'}>
                              {pagada ? <Check size={11} className="mr-1" /> : <Clock size={11} className="mr-1" />}
                              {pagada ? 'Pagada' : 'Pendiente'}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setEditandoLiq(l)}
                              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-oro"
                              aria-label="Editar liquidación"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => borrarLiquidacion(l.id)}
                              className="rounded p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-rojo"
                              aria-label="Eliminar liquidación"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-borde-fuerte bg-panel-2/60 text-sm font-semibold">
                  <td className="px-5 py-3 text-tinta-2" colSpan={3}>
                    Total liquidaciones
                  </td>
                  <td className="cifra px-3 py-3 text-right text-tinta">
                    {eur(liquidadoLiquidaciones + pendienteLiquidaciones)}
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-normal text-tinta-3">
                    {eur0(liquidadoLiquidaciones)} pagado · {eur0(pendienteLiquidaciones)} pendiente
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      <ProveedorModal
        proveedor={editando}
        onGuardar={(p) => {
          guardarProveedor(p)
          setEditando(null)
        }}
        onCerrar={() => setEditando(null)}
      />

      <LiquidacionModal
        liquidacion={editandoLiq}
        proveedores={estado.proveedores}
        temporadas={estado.temporadas.map((t) => t.year)}
        onGuardar={(l) => {
          guardarLiquidacion(l)
          setEditandoLiq(null)
        }}
        onCerrar={() => setEditandoLiq(null)}
      />

      <Confirmacion
        abierto={aBorrar !== null}
        titulo="Eliminar proveedor"
        mensaje={
          <>
            Se eliminará <strong className="text-tinta">{aBorrar?.nombre}</strong> y sus liquidaciones. Las
            operaciones mantienen su coste, pero pierden la referencia a este proveedor. Si solo quieres dejar de
            usarlo, márcalo como inactivo desde su ficha.
          </>
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar) borrarProveedor(aBorrar.id)
          setABorrar(null)
        }}
      />
    </div>
  )
}

function ProveedorModal({
  proveedor,
  onGuardar,
  onCerrar,
}: {
  proveedor: Proveedor | null
  onGuardar: (p: Proveedor) => void
  onCerrar: () => void
}) {
  const [borrador, setBorrador] = useState<Proveedor | null>(proveedor)
  const clave = proveedor?.id ?? 'ninguno'

  // Reinicia el borrador cuando cambia el proveedor seleccionado.
  const [claveActual, setClaveActual] = useState(clave)
  if (claveActual !== clave) {
    setClaveActual(clave)
    setBorrador(proveedor)
  }

  if (!borrador) return null
  const set = (c: Partial<Proveedor>) => setBorrador({ ...borrador, ...c })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={proveedor?.nombre ? `Proveedor · ${proveedor.nombre}` : 'Nuevo proveedor'}
      ancho="max-w-2xl"
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" disabled={!borrador.nombre.trim()} onClick={() => onGuardar(borrador)}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre" className="sm:col-span-2">
          <Texto value={borrador.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Marbella Football Center" />
        </Campo>
        <Campo etiqueta="Tipo">
          <Selector
            value={borrador.tipo}
            onChange={(e) => set({ tipo: e.target.value as TipoProveedor })}
            opciones={TIPOS}
          />
        </Campo>
        <Campo etiqueta="Tarifa habitual" ayuda="Se propone al asignar este proveedor a una línea de servicio">
          <NumeroInput
            valor={borrador.tarifaHabitual}
            onValor={(n) => set({ tarifaHabitual: n })}
            className="campo cifra text-right"
            sufijo="€"
          />
        </Campo>
        <Campo etiqueta="Contacto">
          <Texto value={borrador.contacto} onChange={(e) => set({ contacto: e.target.value })} placeholder="email o teléfono" />
        </Campo>
        <Campo etiqueta="CIF / NIF">
          <Texto value={borrador.cif} onChange={(e) => set({ cif: e.target.value })} />
        </Campo>
        <Campo etiqueta="Notas" className="sm:col-span-2">
          <textarea
            value={borrador.notas}
            onChange={(e) => set({ notas: e.target.value })}
            rows={2}
            className="campo resize-y"
          />
        </Campo>
        <label className="flex items-center gap-2 text-sm text-tinta-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={borrador.activo}
            onChange={(e) => set({ activo: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-oro)]"
          />
          Proveedor activo (aparece al asignar servicios)
        </label>
      </div>
    </Modal>
  )
}

function LiquidacionModal({
  liquidacion,
  proveedores,
  temporadas,
  onGuardar,
  onCerrar,
}: {
  liquidacion: Liquidacion | null
  proveedores: Proveedor[]
  temporadas: number[]
  onGuardar: (l: Liquidacion) => void
  onCerrar: () => void
}) {
  const [borrador, setBorrador] = useState<Liquidacion | null>(liquidacion)
  const clave = liquidacion?.id ?? 'ninguna'
  const [claveActual, setClaveActual] = useState(clave)
  if (claveActual !== clave) {
    setClaveActual(clave)
    setBorrador(liquidacion)
  }

  if (!borrador) return null
  const set = (c: Partial<Liquidacion>) => setBorrador({ ...borrador, ...c })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={liquidacion?.concepto ? 'Editar liquidación' : 'Nueva liquidación'}
      ancho="max-w-xl"
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" disabled={!borrador.proveedorId} onClick={() => onGuardar(borrador)}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Proveedor" className="sm:col-span-2">
          <Selector
            value={borrador.proveedorId}
            onChange={(e) => set({ proveedorId: e.target.value })}
            opciones={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
          />
        </Campo>
        <Campo etiqueta="Fecha">
          <Texto type="date" value={borrador.fecha} onChange={(e) => set({ fecha: e.target.value })} />
        </Campo>
        <Campo etiqueta="Temporada">
          <Selector
            value={String(borrador.temporada)}
            onChange={(e) => set({ temporada: Number(e.target.value) })}
            opciones={temporadas.map((y) => ({ valor: String(y), texto: String(y) }))}
          />
        </Campo>
        <Campo etiqueta="Concepto" className="sm:col-span-2">
          <Texto
            value={borrador.concepto}
            onChange={(e) => set({ concepto: e.target.value })}
            placeholder="Alquiler de campo marzo 2026"
          />
        </Campo>
        <Campo etiqueta="Importe">
          <NumeroInput
            valor={borrador.importe}
            onValor={(n) => set({ importe: n })}
            className="campo cifra text-right"
            sufijo="€"
          />
        </Campo>
        <Campo etiqueta="Estado">
          <Selector
            value={borrador.estado}
            onChange={(e) => set({ estado: e.target.value as Liquidacion['estado'] })}
            opciones={[
              { valor: 'pendiente', texto: 'Pendiente' },
              { valor: 'pagada', texto: 'Pagada' },
            ]}
          />
        </Campo>
      </div>
    </Modal>
  )
}
