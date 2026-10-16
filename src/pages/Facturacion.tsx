import { useMemo, useState } from 'react'
import { Check, Clock, Download, Plus, Search, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { agruparGastoPorCategoria, r2, resumirLibros } from '../lib/calc'
import { descargarFichero, nombreConFecha } from '../lib/descarga'
import { eur, eur0, hoyISO, pct } from '../lib/format'
import { uid } from '../lib/id'
import { TIPOS_IVA, type FacturaEmitida, type FacturaRecibida } from '../types'
import { Badge, Barra, Boton, Confirmacion, NumeroInput, Panel, Vacio } from '../components/ui'
import { KpiCard } from '../components/KpiCard'

type Libro = 'emitidas' | 'recibidas'

const OPCIONES_IVA = TIPOS_IVA.map((v) => ({
  valor: String(v),
  texto: v === 0 ? 'Sin IVA' : `${Math.round(v * 100)} %`,
}))

export function Facturacion() {
  const {
    estado,
    temporadaSel,
    emitidasFiltradas,
    recibidasFiltradas,
    guardarEmitida,
    borrarEmitida,
    guardarRecibida,
    borrarRecibida,
    guardarRepartoCompartido,
  } = useStore()

  const [libro, setLibro] = useState<Libro>('emitidas')
  const [busqueda, setBusqueda] = useState('')
  const [aBorrar, setABorrar] = useState<{ tipo: Libro; id: string; etiqueta: string } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const reparto = estado.repartoCompartidoPct

  const resumen = useMemo(
    () => resumirLibros(emitidasFiltradas, recibidasFiltradas, reparto),
    [emitidasFiltradas, recibidasFiltradas, reparto],
  )

  const categorias = useMemo(
    () => agruparGastoPorCategoria(recibidasFiltradas, estado.categoriasGasto, reparto),
    [recibidasFiltradas, estado.categoriasGasto, reparto],
  )

  const q = busqueda.trim().toLowerCase()
  const emitidas = useMemo(
    () =>
      emitidasFiltradas
        .filter(
          (f) =>
            !q ||
            f.cliente.toLowerCase().includes(q) ||
            f.numero.toLowerCase().includes(q) ||
            f.cif.toLowerCase().includes(q),
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero)),
    [emitidasFiltradas, q],
  )

  const recibidas = useMemo(
    () =>
      recibidasFiltradas
        .filter(
          (f) =>
            !q ||
            f.proveedor.toLowerCase().includes(q) ||
            f.numero.toLowerCase().includes(q) ||
            f.cif.toLowerCase().includes(q) ||
            (estado.categoriasGasto[f.categoria] ?? '').toLowerCase().includes(q),
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [recibidasFiltradas, q, estado.categoriasGasto],
  )

  const temporadaActiva =
    temporadaSel === 'todas' ? estado.temporadas.at(-1)?.year ?? new Date().getFullYear() : temporadaSel

  const nuevaEmitida = () => {
    const correlativo = estado.facturasEmitidas.filter((f) => f.temporada === temporadaActiva).length + 1
    guardarEmitida({
      id: uid('fe'),
      fecha: hoyISO(),
      numero: `MM/${String(correlativo).padStart(6, '0')}`,
      cliente: '',
      cif: '',
      temporada: temporadaActiva,
      base: 0,
      ivaPct: 0.21,
      retencionPct: 0,
      cobrada: false,
      notas: '',
    })
    setLibro('emitidas')
  }

  const nuevaRecibida = () => {
    guardarRecibida({
      id: uid('fr'),
      fecha: hoyISO(),
      numero: '',
      proveedor: '',
      cif: '',
      temporada: temporadaActiva,
      base: 0,
      ivaPct: 0.21,
      retencionPct: 0,
      categoria: 'campoGym',
      compartida: false,
      pagada: false,
      notas: '',
    })
    setLibro('recibidas')
  }

  const exportar = async () => {
    const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const cab =
      libro === 'emitidas'
        ? ['Fecha', 'Nº Factura', 'Cliente', 'CIF', 'Base', '% IVA', 'Cuota IVA', 'Total', 'Cobrada', 'Notas']
        : ['Fecha', 'Nº Factura', 'Proveedor', 'CIF', 'Categoría', 'Base', '% IVA', 'Cuota IVA', 'Total', 'Compartida', 'Imputado a Magno', 'Pagada', 'Notas']
    const cuerpo =
      libro === 'emitidas'
        ? emitidas.map((f) =>
            [f.fecha, f.numero, f.cliente, f.cif, f.base, (f.ivaPct * 100).toFixed(0), r2(f.base * f.ivaPct), r2(f.base * (1 + f.ivaPct)), f.cobrada ? 'Sí' : 'No', f.notas]
              .map(escapar)
              .join(';'),
          )
        : recibidas.map((f) => {
            const total = r2(f.base * (1 + f.ivaPct))
            return [f.fecha, f.numero, f.proveedor, f.cif, estado.categoriasGasto[f.categoria] ?? f.categoria, f.base, (f.ivaPct * 100).toFixed(0), r2(f.base * f.ivaPct), total, f.compartida ? 'Sí' : 'No', r2(total * (f.compartida ? reparto : 1)), f.pagada ? 'Sí' : 'No', f.notas]
              .map(escapar)
              .join(';')
          })
    const csv = `﻿${[cab.map(escapar).join(';'), ...cuerpo].join('\n')}`
    const r = await descargarFichero(nombreConFecha(`magno-libro-${libro}`, 'csv'), csv, 'text/csv;charset=utf-8')
    if (r === 'error') setAviso('No se ha podido descargar el libro en este navegador.')
  }

  const clientesConocidos = [...new Set([...estado.clientes.map((c) => c.nombre), ...estado.facturasEmitidas.map((f) => f.cliente)])].filter(Boolean)
  const proveedoresConocidos = [...new Set([...estado.proveedores.map((p) => p.nombre), ...estado.facturasRecibidas.map((f) => f.proveedor)])].filter(Boolean)

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          etiqueta="Facturado (emitidas)"
          valor={eur(resumen.totalEmitido)}
          tono="oro"
          destacado
          nota={<>{resumen.emitidas} facturas · base {eur0(resumen.baseEmitida)} · IVA {eur0(resumen.ivaRepercutido)}</>}
        />
        <KpiCard
          etiqueta="Gasto imputado (recibidas)"
          valor={eur(resumen.totalRecibido)}
          tono="rojo"
          progreso={resumen.totalEmitido > 0 ? resumen.totalRecibido / resumen.totalEmitido : 0}
          nota={<>{resumen.recibidas} facturas · IVA soportado {eur0(resumen.ivaSoportado)}</>}
        />
        <KpiCard
          etiqueta="Margen del libro"
          valor={eur(resumen.margen)}
          tono="verde"
          destacado
          progreso={resumen.margenPct}
          nota={<>{pct(resumen.margenPct)} sobre lo facturado</>}
        />
        <KpiCard
          etiqueta="IVA a liquidar"
          valor={eur(resumen.ivaLiquidar)}
          tono={resumen.ivaLiquidar >= 0 ? 'violeta' : 'verde'}
          nota={<>Repercutido {eur0(resumen.ivaRepercutido)} − soportado {eur0(resumen.ivaSoportado)}</>}
        />
        <KpiCard
          etiqueta="Pendiente de cobro"
          valor={eur(resumen.pendienteCobro)}
          tono={resumen.pendienteCobro > 0 ? 'azul' : 'verde'}
        />
        <KpiCard
          etiqueta="Pendiente de pago"
          valor={eur(resumen.pendientePago)}
          tono={resumen.pendientePago > 0 ? 'cian' : 'verde'}
        />
        {resumen.retencionPracticada > 0 && (
          <KpiCard
            etiqueta="IRPF retenido a profesionales"
            valor={eur(resumen.retencionPracticada)}
            tono="violeta"
            nota={<>Retenido en facturas de autónomos; se ingresa en Hacienda, no se le paga al proveedor</>}
          />
        )}
      </div>

      {/* --------------------------- Gastos compartidos -------------------------- */}
      {resumen.compartidoTotal > 0 && (
        <Panel
          titulo="Gastos compartidos con la agencia"
          descripcion="Combustible, vuelos, comidas y otros gastos que sirven a Magno y a SCM Sports Agency"
        >
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-xs text-tinta-2">
              Se imputa a Magno
              <NumeroInput
                valor={r2(reparto * 100)}
                onValor={(n) => guardarRepartoCompartido(n / 100)}
                className="campo cifra text-right"
                claseContenedor="w-24"
                sufijo="%"
                aria-label="Porcentaje de gastos compartidos imputado a Magno"
              />
            </label>
            <div className="text-xs text-tinta-2">
              De {eur(resumen.compartidoTotal)} compartidos, a Magno le corresponden{' '}
              <strong className="text-tinta">{eur(resumen.compartidoImputado)}</strong>; el resto queda en la
              agencia.
            </div>
          </div>
        </Panel>
      )}

      {/* ------------------------------ Los dos libros --------------------------- */}
      <Panel
        sinPadding
        titulo={libro === 'emitidas' ? 'Libro de facturas emitidas' : 'Libro de facturas recibidas'}
        descripcion="Se edita directamente sobre la tabla, como en una hoja de cálculo"
        acciones={
          <>
            <div className="flex rounded-lg border border-borde p-0.5">
              {(['emitidas', 'recibidas'] as Libro[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLibro(l)}
                  aria-pressed={libro === l}
                  className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                    libro === l ? 'bg-oro/15 text-oro' : 'text-tinta-2 hover:text-tinta'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre, nº o CIF…"
                className="campo w-52 pl-8"
                aria-label="Buscar en el libro"
              />
            </div>
            <Boton onClick={exportar} title="Exportar el libro en vista">
              <Download size={13} /> CSV
            </Boton>
            <Boton variante="primario" onClick={libro === 'emitidas' ? nuevaEmitida : nuevaRecibida}>
              <Plus size={13} /> Nueva factura
            </Boton>
          </>
        }
      >
        {libro === 'emitidas' ? (
          emitidas.length === 0 ? (
            <Vacio
              titulo="Libro vacío"
              mensaje="No hay facturas emitidas en esta temporada."
              accion={
                <Boton variante="primario" onClick={nuevaEmitida}>
                  <Plus size={13} /> Crear la primera
                </Boton>
              }
            />
          ) : (
            <TablaEmitidas
              facturas={emitidas}
              clientes={clientesConocidos}
              onCambio={guardarEmitida}
              onBorrar={(f) => setABorrar({ tipo: 'emitidas', id: f.id, etiqueta: `${f.numero} · ${f.cliente}` })}
              resumen={resumen}
            />
          )
        ) : recibidas.length === 0 ? (
          <Vacio
            titulo="Libro vacío"
            mensaje="No hay facturas recibidas en esta temporada."
            accion={
              <Boton variante="primario" onClick={nuevaRecibida}>
                <Plus size={13} /> Crear la primera
              </Boton>
            }
          />
        ) : (
          <TablaRecibidas
            facturas={recibidas}
            proveedores={proveedoresConocidos}
            categorias={estado.categoriasGasto}
            reparto={reparto}
            onCambio={guardarRecibida}
            onBorrar={(f) => setABorrar({ tipo: 'recibidas', id: f.id, etiqueta: `${f.numero || 'sin nº'} · ${f.proveedor}` })}
            resumen={resumen}
          />
        )}
      </Panel>

      {/* ------------------------------- Categorías ------------------------------ */}
      {categorias.length > 0 && (
        <Panel
          sinPadding
          titulo="Gasto por categoría"
          descripcion="Importe ya imputado a Magno, con los compartidos al porcentaje de reparto"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                  <th className="px-5 py-2.5 text-left font-medium">Categoría</th>
                  <th className="px-3 py-2.5 text-right font-medium">Facturas</th>
                  <th className="px-3 py-2.5 text-right font-medium">Importe</th>
                  <th className="px-5 py-2.5 text-right font-medium">Peso</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((c) => (
                  <tr key={c.categoria} className="border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                    <td className="px-5 py-3 text-tinta">
                      {c.etiqueta}
                      <div className="mt-1.5 max-w-[220px]">
                        <Barra valor={c.pesoPct} color="var(--color-rojo)" />
                      </div>
                    </td>
                    <td className="cifra px-3 py-3 text-right text-tinta-2">{c.facturas}</td>
                    <td className="cifra px-3 py-3 text-right font-medium text-rojo">{eur(c.importe)}</td>
                    <td className="cifra px-5 py-3 text-right text-tinta-3">{pct(c.pesoPct, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Confirmacion
        abierto={aBorrar !== null}
        titulo="Eliminar factura"
        mensaje={
          <>
            Se eliminará <strong className="text-tinta">{aBorrar?.etiqueta}</strong> del libro. Esta acción no se
            puede deshacer.
          </>
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar?.tipo === 'emitidas') borrarEmitida(aBorrar.id)
          if (aBorrar?.tipo === 'recibidas') borrarRecibida(aBorrar.id)
          setABorrar(null)
        }}
      />
    </div>
  )
}

function TablaEmitidas({
  facturas,
  clientes,
  onCambio,
  onBorrar,
  resumen,
}: {
  facturas: FacturaEmitida[]
  clientes: string[]
  onCambio: (f: FacturaEmitida) => void
  onBorrar: (f: FacturaEmitida) => void
  resumen: ReturnType<typeof resumirLibros>
}) {
  const { estado } = useStore()
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1020px] text-sm">
        <thead className="sticky top-0 z-10 bg-panel">
          <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
            <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
            <th className="px-2 py-2.5 text-left font-medium">Nº factura</th>
            <th className="px-2 py-2.5 text-left font-medium">Cliente</th>
            <th className="px-2 py-2.5 text-left font-medium">CIF</th>
            <th className="px-2 py-2.5 text-right font-medium">Base</th>
            <th className="px-2 py-2.5 text-center font-medium">% IVA</th>
            <th className="px-2 py-2.5 text-right font-medium">Cuota IVA</th>
            <th className="px-2 py-2.5 text-right font-medium">Total</th>
            <th className="px-2 py-2.5 text-center font-medium">Cobro</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => {
            const iva = r2(f.base * f.ivaPct)
            return (
              <tr key={f.id} className="group border-b border-borde/60 last:border-0 hover:bg-panel-2/40">
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={f.fecha}
                    onChange={(e) => onCambio({ ...f, fecha: e.target.value })}
                    className="celda-edit w-[126px]"
                    aria-label={`Fecha de ${f.numero}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={f.numero}
                    onChange={(e) => onCambio({ ...f, numero: e.target.value })}
                    className="celda-edit w-[112px]"
                    aria-label="Número de factura"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={f.cliente}
                    onChange={(e) => {
                      const nombre = e.target.value
                      const ficha = estado.clientes.find(
                        (c) => c.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
                      )
                      onCambio({ ...f, cliente: nombre, ...(ficha?.cif && !f.cif ? { cif: ficha.cif } : {}) })
                    }}
                    list="lista-clientes-libro"
                    placeholder="Cliente"
                    className="celda-edit min-w-[190px]"
                    aria-label="Cliente"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={f.cif}
                    onChange={(e) => onCambio({ ...f, cif: e.target.value })}
                    className="celda-edit w-[112px]"
                    aria-label="CIF del cliente"
                  />
                </td>
                <td className="px-2 py-2">
                  <NumeroInput
                    valor={f.base}
                    onValor={(n) => onCambio({ ...f, base: n })}
                    decimalesMinimos={2}
                    className="celda-edit w-full text-right"
                    claseContenedor="ml-auto w-28"
                    aria-label={`Base de ${f.numero}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={String(f.ivaPct)}
                    onChange={(e) => onCambio({ ...f, ivaPct: Number(e.target.value) })}
                    className={`celda-edit w-[86px] ${f.ivaPct === 0 ? 'text-oro' : ''}`}
                    aria-label={`IVA de ${f.numero}`}
                  >
                    {OPCIONES_IVA.map((o) => (
                      <option key={o.valor} value={o.valor} className="bg-panel">
                        {o.texto}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="cifra px-2 py-2 text-right text-tinta-2">{eur(iva)}</td>
                <td className="cifra px-2 py-2 text-right font-medium text-oro">{eur(r2(f.base + iva))}</td>
                <td className="px-2 py-2 text-center">
                  <button type="button" onClick={() => onCambio({ ...f, cobrada: !f.cobrada })} className="inline-flex">
                    <Badge tono={f.cobrada ? 'verde' : 'azul'}>
                      {f.cobrada ? <Check size={11} className="mr-1" /> : <Clock size={11} className="mr-1" />}
                      {f.cobrada ? 'Cobrada' : 'Pendiente'}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => onBorrar(f)}
                    className="rounded p-1.5 text-tinta-3 opacity-60 transition-opacity hover:bg-panel-2 hover:text-rojo group-hover:opacity-100"
                    aria-label={`Eliminar ${f.numero}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-borde-fuerte bg-panel-2/60 text-sm font-semibold">
            <td className="px-4 py-3 text-tinta-2" colSpan={4}>
              {facturas.length} facturas
            </td>
            <td className="cifra px-2 py-3 text-right text-tinta">{eur(resumen.baseEmitida)}</td>
            <td />
            <td className="cifra px-2 py-3 text-right text-tinta-2">{eur(resumen.ivaRepercutido)}</td>
            <td className="cifra px-2 py-3 text-right text-oro">{eur(resumen.totalEmitido)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
      <datalist id="lista-clientes-libro">
        {clientes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  )
}

function TablaRecibidas({
  facturas,
  proveedores,
  categorias,
  reparto,
  onCambio,
  onBorrar,
  resumen,
}: {
  facturas: FacturaRecibida[]
  proveedores: string[]
  categorias: Record<string, string>
  reparto: number
  onCambio: (f: FacturaRecibida) => void
  onBorrar: (f: FacturaRecibida) => void
  resumen: ReturnType<typeof resumirLibros>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1300px] text-sm">
        <thead className="sticky top-0 z-10 bg-panel">
          <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
            <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
            <th className="px-2 py-2.5 text-left font-medium">Nº factura</th>
            <th className="px-2 py-2.5 text-left font-medium">Proveedor</th>
            <th className="px-2 py-2.5 text-left font-medium">Categoría</th>
            <th className="px-2 py-2.5 text-right font-medium">Base</th>
            <th className="px-2 py-2.5 text-center font-medium">% IVA</th>
            <th className="px-2 py-2.5 text-center font-medium">% IRPF</th>
            <th className="px-2 py-2.5 text-right font-medium">A pagar</th>
            <th className="px-2 py-2.5 text-center font-medium">Compartida</th>
            <th className="px-2 py-2.5 text-right font-medium">Imputado</th>
            <th className="px-2 py-2.5 text-center font-medium">Pago</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => {
            const retencion = r2(f.base * f.retencionPct)
            const total = r2(f.base + r2(f.base * f.ivaPct) - retencion)
            const imputado = r2(total * (f.compartida ? reparto : 1))
            return (
              <tr key={f.id} className="group border-b border-borde/60 last:border-0 hover:bg-panel-2/40">
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={f.fecha}
                    onChange={(e) => onCambio({ ...f, fecha: e.target.value })}
                    className="celda-edit w-[126px]"
                    aria-label="Fecha de la factura recibida"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={f.numero}
                    onChange={(e) => onCambio({ ...f, numero: e.target.value })}
                    className="celda-edit w-[118px]"
                    aria-label="Número de la factura recibida"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={f.proveedor}
                    onChange={(e) => onCambio({ ...f, proveedor: e.target.value })}
                    list="lista-proveedores-libro"
                    placeholder="Proveedor"
                    className="celda-edit min-w-[200px]"
                    aria-label="Proveedor"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={f.categoria}
                    onChange={(e) => onCambio({ ...f, categoria: e.target.value })}
                    className="celda-edit min-w-[158px]"
                    aria-label="Categoría de gasto"
                  >
                    {Object.entries(categorias).map(([k, v]) => (
                      <option key={k} value={k} className="bg-panel">
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <NumeroInput
                    valor={f.base}
                    onValor={(n) => onCambio({ ...f, base: n })}
                    decimalesMinimos={2}
                    className="celda-edit w-full text-right"
                    claseContenedor="ml-auto w-24"
                    aria-label="Base de la factura recibida"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={String(f.ivaPct)}
                    onChange={(e) => onCambio({ ...f, ivaPct: Number(e.target.value) })}
                    className={`celda-edit w-[86px] ${f.ivaPct === 0 ? 'text-oro' : ''}`}
                    aria-label="IVA soportado"
                  >
                    {OPCIONES_IVA.map((o) => (
                      <option key={o.valor} value={o.valor} className="bg-panel">
                        {o.texto}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <NumeroInput
                    valor={r2(f.retencionPct * 100)}
                    onValor={(n) => onCambio({ ...f, retencionPct: n / 100 })}
                    className={`celda-edit w-full text-right ${f.retencionPct > 0 ? 'text-violeta' : ''}`}
                    claseContenedor="w-[74px]"
                    sufijo="%"
                    aria-label="Retención de IRPF"
                  />
                </td>
                <td
                  className="cifra px-2 py-2 text-right text-tinta-2"
                  title={retencion > 0 ? `Base ${eur(f.base)} + IVA ${eur(r2(f.base * f.ivaPct))} − IRPF ${eur(retencion)}` : undefined}
                >
                  {eur(total)}
                </td>
                <td className="px-2 py-2 text-center">
                  <button type="button" onClick={() => onCambio({ ...f, compartida: !f.compartida })} className="inline-flex">
                    <Badge tono={f.compartida ? 'violeta' : 'neutro'}>
                      {f.compartida ? `${pct(reparto, 0)} Magno` : 'Solo Magno'}
                    </Badge>
                  </button>
                </td>
                <td className="cifra px-2 py-2 text-right font-medium text-rojo">{eur(imputado)}</td>
                <td className="px-2 py-2 text-center">
                  <button type="button" onClick={() => onCambio({ ...f, pagada: !f.pagada })} className="inline-flex">
                    <Badge tono={f.pagada ? 'verde' : 'oro'}>
                      {f.pagada ? <Check size={11} className="mr-1" /> : <Clock size={11} className="mr-1" />}
                      {f.pagada ? 'Pagada' : 'Pendiente'}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => onBorrar(f)}
                    className="rounded p-1.5 text-tinta-3 opacity-60 transition-opacity hover:bg-panel-2 hover:text-rojo group-hover:opacity-100"
                    aria-label="Eliminar factura recibida"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-borde-fuerte bg-panel-2/60 text-sm font-semibold">
            <td className="px-4 py-3 text-tinta-2" colSpan={4}>
              {facturas.length} facturas
            </td>
            <td className="cifra px-2 py-3 text-right text-tinta">{eur(resumen.baseRecibida)}</td>
            <td />
            <td className="cifra px-2 py-3 text-right text-violeta">{eur(resumen.retencionPracticada)}</td>
            <td className="cifra px-2 py-3 text-right text-tinta-2">
              {eur(r2(resumen.baseRecibida + resumen.ivaSoportado - resumen.retencionPracticada))}
            </td>
            <td />
            <td className="cifra px-2 py-3 text-right text-rojo">{eur(resumen.totalRecibido)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
      <datalist id="lista-proveedores-libro">
        {proveedores.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  )
}
