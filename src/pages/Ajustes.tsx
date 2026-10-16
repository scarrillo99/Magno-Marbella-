import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useStore } from '../store/store'
import { calcularOperacion, r2, resumirLibros, resumirOperaciones } from '../lib/calc'
import { descargarJSON } from '../lib/storage'
import { importarHojaMagno, type ResultadoImportacion } from '../lib/importarHoja'
import { calcularOperacion as calcOp } from '../lib/calc'
import { eur, pct } from '../lib/format'
import type { Temporada } from '../types'
import { Badge, Boton, Campo, Confirmacion, NumeroInput, Panel, Selector, Texto } from '../components/ui'

export function Ajustes() {
  const {
    estado,
    guardarOperacion,
    guardarTemporada,
    borrarTemporada,
    guardarUbicaciones,
    importarEstado,
    restablecer,
  } = useStore()

  const [nuevoAnio, setNuevoAnio] = useState<number>(
    (estado.temporadas.at(-1)?.year ?? new Date().getFullYear()) + 1,
  )
  const [nuevaUbicacion, setNuevaUbicacion] = useState('')
  const [temporadaImportacion, setTemporadaImportacion] = useState(
    () => estado.temporadas.at(-1)?.year ?? new Date().getFullYear(),
  )
  const [confirmarReset, setConfirmarReset] = useState(false)
  const [temporadaABorrar, setTemporadaABorrar] = useState<Temporada | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pegado, setPegado] = useState('')
  const [previa, setPrevia] = useState<ResultadoImportacion | null>(null)
  const inputFichero = useRef<HTMLInputElement>(null)

  const yaExiste = estado.temporadas.some((t) => t.year === nuevoAnio)

  const conciliacion = useMemo(
    () =>
      estado.resumenesDeclarados.map((d) => {
        const calc = resumirOperaciones(
          estado.operaciones.filter((o) => o.temporada === d.temporada).map(calcularOperacion),
          estado.temporadas,
        )
        const margenDeclarado = r2(d.totalFacturado - d.totalGastosProveedores)
        return {
          declarado: d,
          calc,
          margenDeclarado,
          difFacturado: r2(calc.totalFacturado - d.totalFacturado),
          difCostes: r2(calc.totalCostesProveedores - d.totalGastosProveedores),
          difMargen: r2(calc.margenBruto - margenDeclarado),
        }
      }),
    [estado.operaciones, estado.temporadas, estado.resumenesDeclarados],
  )

  /** Cruce libro contable / detalle operativo, temporada a temporada. */
  const librosPorTemporada = useMemo(
    () =>
      estado.temporadas
        .map((t) => {
          const libro = resumirLibros(
            estado.facturasEmitidas.filter((f) => f.temporada === t.year),
            estado.facturasRecibidas.filter((f) => f.temporada === t.year),
            estado.repartoCompartidoPct,
          )
          const ops = resumirOperaciones(
            estado.operaciones.filter((o) => o.temporada === t.year).map(calcularOperacion),
            estado.temporadas,
          )
          return {
            year: t.year,
            libro,
            ops,
            difIngreso: r2(ops.totalFacturado - libro.totalEmitido),
            difGasto: r2(ops.totalCostesProveedores - libro.totalRecibido),
          }
        })
        .filter((x) => x.libro.emitidas > 0 || x.libro.recibidas > 0),
    [estado],
  )

  const importar = (fichero: File) => {
    const lector = new FileReader()
    lector.onload = () => {
      try {
        importarEstado(JSON.parse(String(lector.result)))
        setAviso('Datos importados correctamente.')
      } catch {
        setAviso('El fichero no es un JSON válido.')
      }
    }
    lector.readAsText(fichero)
  }

  const contarOperaciones = (year: number) => estado.operaciones.filter((o) => o.temporada === year).length

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

      {/* ------------------------------- Temporadas ------------------------------ */}
      <Panel
        sinPadding
        titulo="Temporadas y parametros fiscales"
        descripcion="El tipo impositivo, el IVA y el fee de servicio se aplican por temporada"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-borde text-[11px] uppercase tracking-wider text-tinta-3">
                <th className="px-5 py-2.5 text-left font-medium">Temporada</th>
                <th className="px-3 py-2.5 text-right font-medium">Impuesto sociedades</th>
                <th className="px-3 py-2.5 text-right font-medium">IVA</th>
                <th className="px-3 py-2.5 text-right font-medium">Fee servicio</th>
                <th className="px-3 py-2.5 text-right font-medium">Operaciones</th>
                <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estado.temporadas.map((t) => (
                <tr key={t.year} className="group border-b border-borde/60 last:border-0 hover:bg-panel-2/50">
                  <td className="px-5 py-3 font-medium text-tinta">{t.year}</td>
                  {(
                    [
                      ['impuestoPct', 'Impuesto de sociedades'],
                      ['ivaPct', 'IVA'],
                      ['feePct', 'Fee de servicio'],
                    ] as const
                  ).map(([campo, etiqueta]) => (
                    <td key={campo} className="px-3 py-3">
                      <NumeroInput
                        valor={r2(t[campo] * 100)}
                        onValor={(n) => guardarTemporada({ ...t, [campo]: n / 100 })}
                        className="celda-edit w-full text-right"
                        claseContenedor="ml-auto w-24"
                        sufijo="%"
                        aria-label={`${etiqueta} de ${t.year}`}
                      />
                    </td>
                  ))}
                  <td className="cifra px-3 py-3 text-right text-tinta-2">{contarOperaciones(t.year)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTemporadaABorrar(t)}
                      className="rounded p-1.5 text-tinta-3 opacity-60 transition-opacity hover:bg-panel-2 hover:text-rojo group-hover:opacity-100"
                      aria-label={`Eliminar temporada ${t.year}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-borde p-5">
          <Campo etiqueta="Nueva temporada" className="w-36">
            <NumeroInput
              valor={nuevoAnio}
              onValor={(n) => setNuevoAnio(Math.round(n))}
              decimales={0}
              className="campo cifra text-right"
            />
          </Campo>
          <Boton
            variante="primario"
            disabled={yaExiste || nuevoAnio < 2000 || nuevoAnio > 2100}
            onClick={() =>
              guardarTemporada({
                year: nuevoAnio,
                impuestoPct: estado.temporadas.at(-1)?.impuestoPct ?? 0.25,
                ivaPct: 0.21,
                feePct: 0.2,
                activa: true,
              })
            }
          >
            <Plus size={13} /> Crear temporada
          </Boton>
          {yaExiste && <span className="text-xs text-tinta-3">La temporada {nuevoAnio} ya existe.</span>}
        </div>
      </Panel>

      {/* ------------------------------ Conciliación ----------------------------- */}
      <Panel
        titulo="Conciliación con el control operativo"
        descripcion="Cifras oficiales del control de origen frente a lo que calcula la plataforma"
      >
        <div className="mb-4 flex gap-3 rounded-xl border border-oro/30 bg-oro/8 p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-oro" />
          <div className="space-y-2 text-xs leading-relaxed text-tinta-2">
            <p>
              <strong className="text-tinta">Revision del impuesto declarado.</strong> En el control de origen,
              el impuesto de sociedades y el beneficio neto de ambas temporadas están calculados sobre el{' '}
              <em>total de gastos de proveedores</em>, no sobre el margen bruto:
              en 2025, 40.957,42 € × 22 % = 9.010,63 € (el impuesto declarado) y 40.957,42 € − 9.010,63 € =
              31.946,79 € (el beneficio neto declarado). El mismo patrón se repite en 2026 con el 25 %.
            </p>
            <p>
              Esta plataforma aplica la fórmula correcta —{' '}
              <strong className="text-tinta">impuesto = margen bruto × tipo</strong> y{' '}
              <strong className="text-tinta">beneficio neto = margen bruto − impuesto</strong> —, por lo que las
              cifras de impuesto y beneficio neto difieren a propósito de las declaradas. Conviene revisar el
              control de origen antes de usarlo para la declaración.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {conciliacion.map(({ declarado, calc, margenDeclarado, difFacturado, difCostes, difMargen }) => (
            <div key={declarado.temporada} className="overflow-x-auto rounded-xl border border-borde">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-borde bg-panel-2/50 text-[11px] uppercase tracking-wider text-tinta-3">
                    <th className="px-4 py-2 text-left font-medium">Temporada {declarado.temporada}</th>
                    <th className="px-3 py-2 text-right font-medium">Declarado</th>
                    <th className="px-3 py-2 text-right font-medium">Calculado</th>
                    <th className="px-4 py-2 text-right font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  <FilaConciliacion label="Total facturado" declarado={declarado.totalFacturado} calculado={calc.totalFacturado} diferencia={difFacturado} />
                  <FilaConciliacion label="Gastos de proveedores" declarado={declarado.totalGastosProveedores} calculado={calc.totalCostesProveedores} diferencia={difCostes} />
                  <FilaConciliacion label="Margen bruto" declarado={margenDeclarado} calculado={calc.margenBruto} diferencia={difMargen} />
                  <FilaConciliacion
                    label={`Impuesto de sociedades (${pct(calc.impuestoPctEfectivo, 0)})`}
                    declarado={declarado.impuestos}
                    calculado={calc.impuestoSociedades}
                    diferencia={r2(calc.impuestoSociedades - declarado.impuestos)}
                    nota="base incorrecta en origen"
                  />
                  <FilaConciliacion
                    label="Beneficio neto"
                    declarado={declarado.beneficioNeto}
                    calculado={calc.beneficioNeto}
                    diferencia={r2(calc.beneficioNeto - declarado.beneficioNeto)}
                    nota="base incorrecta en origen"
                  />
                  {declarado.detalleCostes.map((d) => (
                    <tr key={d.concepto} className="border-b border-borde/60 last:border-0">
                      <td className="px-4 py-2 text-xs text-tinta-3">{d.concepto} (referencia)</td>
                      <td className="cifra px-3 py-2 text-right text-xs text-tinta-3">{eur(d.importe)}</td>
                      <td className="px-3 py-2 text-right text-xs text-tinta-3">—</td>
                      <td className="px-4 py-2 text-right text-xs text-tinta-3">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-tinta-3">
          Las diferencias de facturado y coste por debajo de 1 € proceden del redondeo a dos decimales de las
          tarifas unitarias reconstruidas a partir de los totales por jugador del control de origen.
        </p>
      </Panel>

      {/* --------------------- Libro frente a operaciones ------------------------ */}
      {librosPorTemporada.length > 0 && (
        <Panel
          titulo="Libro de facturas frente al control de operaciones"
          descripcion="Lo que se facturó de verdad, comparado con lo que suman las operaciones registradas"
        >
          <div className="space-y-4">
            {librosPorTemporada.map(({ year, libro, ops, difIngreso, difGasto }) => (
              <div key={year} className="overflow-x-auto rounded-xl border border-borde">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-borde bg-panel-2/50 text-[11px] uppercase tracking-wider text-tinta-3">
                      <th className="px-4 py-2 text-left font-medium">Temporada {year}</th>
                      <th className="px-3 py-2 text-right font-medium">Libro de facturas</th>
                      <th className="px-3 py-2 text-right font-medium">Operaciones</th>
                      <th className="px-4 py-2 text-right font-medium">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FilaConciliacion label="Facturado" declarado={libro.totalEmitido} calculado={ops.totalFacturado} diferencia={difIngreso} />
                    <FilaConciliacion label="Gasto de proveedores" declarado={libro.totalRecibido} calculado={ops.totalCostesProveedores} diferencia={difGasto} />
                    <FilaConciliacion label="Margen" declarado={libro.margen} calculado={ops.margenBruto} diferencia={r2(ops.margenBruto - libro.margen)} />
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-tinta-3">
            El libro es el registro contable: manda sobre cualquier otra cifra. Las operaciones son el detalle
            operativo de horas y servicios, que puede estar incompleto. Una diferencia grande significa que
            faltan operaciones por registrar, o que hay facturas que no corresponden a servicios de Magno.
          </p>
          <div className="mt-3 flex gap-3 rounded-xl border border-oro/30 bg-oro/8 p-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-oro" />
            <p className="text-xs leading-relaxed text-tinta-2">
              <strong className="text-tinta">Magno no es una sociedad independiente.</strong> Los libros salen
              de una sola sociedad que opera dos actividades, Magno Marbella y SCM Sports Agency, así que el IVA
              y el impuesto de sociedades se liquidan de forma conjunta. El impuesto que calcula el dashboard es
              el que le correspondería a Magno por su propio margen: sirve para medir la rentabilidad de la
              actividad, no como cuota a ingresar.
            </p>
          </div>
        </Panel>
      )}

      {/* --------------------- Importar la hoja de control ----------------------- */}
      <Panel
        titulo="Importar la hoja «MAGNO ENTRENOS»"
        descripcion="Pega las filas desde Google Sheets, con su fila de cabecera, y se convierten en operaciones"
      >
        <ol className="mb-4 space-y-1 text-xs leading-relaxed text-tinta-2">
          <li>1. En la hoja, selecciona desde la fila de cabecera (la que pone «Fecha · Lugar · Nombre») hasta la última fila con datos.</li>
          <li>2. Copia con ⌘C y pega aquí abajo. También vale el contenido de un CSV descargado: se reconoce el separador solo, sea tabulador, coma o punto y coma.</li>
          <li>3. Revisa la vista previa antes de confirmar: nada se guarda hasta que pulses «Importar».</li>
        </ol>
        <textarea
          value={pegado}
          onChange={(e) => {
            setPegado(e.target.value)
            setPrevia(null)
          }}
          rows={5}
          className="campo resize-y font-mono text-[11px]"
          placeholder={'Fecha\tLugar\tNombre\tHora\tCheff o Fisio o Villa\t…'}
          aria-label="Filas copiadas de la hoja"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Boton
            onClick={() =>
              setPrevia(
                importarHojaMagno(pegado, temporadaImportacion, {
                  Campo: null,
                  Entrenador: 'prov_coach',
                  Gimnasio: 'prov_gym',
                  Fisio: 'prov_fisio',
                  'Chef / Villa': 'prov_chef',
                }),
              )
            }
            disabled={!pegado.trim()}
          >
            Analizar
          </Boton>
          <Campo etiqueta="Temporada destino" className="w-32">
            <Selector
              value={String(temporadaImportacion)}
              onChange={(e) => {
                setTemporadaImportacion(Number(e.target.value))
                setPrevia(null)
              }}
              opciones={estado.temporadas.map((t) => ({ valor: String(t.year), texto: String(t.year) }))}
            />
          </Campo>
        </div>

        {previa && (
          <div className="mt-4 space-y-3">
            {previa.avisos.map((a, i) => (
              <p key={i} className="rounded-lg border border-oro/30 bg-oro/8 px-3 py-2 text-xs text-tinta-2">
                {a}
              </p>
            ))}
            {previa.operaciones.length === 0 ? (
              <p className="text-xs text-tinta-3">No se ha reconocido ninguna operación.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-borde">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-borde bg-panel-2/50 text-[11px] uppercase tracking-wider text-tinta-3">
                        <th className="px-3 py-2 text-left font-medium">Jugador</th>
                        <th className="px-3 py-2 text-left font-medium">Lugar</th>
                        <th className="px-3 py-2 text-left font-medium">Servicios</th>
                        <th className="px-3 py-2 text-right font-medium">Total cliente</th>
                        <th className="px-3 py-2 text-right font-medium">Coste</th>
                        <th className="px-3 py-2 text-right font-medium">Beneficio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previa.operaciones.map((o) => {
                        const c = calcOp(o)
                        return (
                          <tr key={o.id} className="border-b border-borde/60 last:border-0">
                            <td className="px-3 py-2 text-tinta">{o.jugador}</td>
                            <td className="px-3 py-2 text-xs text-tinta-2">{o.ubicacion || '—'}</td>
                            <td className="px-3 py-2 text-xs text-tinta-3">
                              {o.lineas.map((l) => `${l.nombre} ×${l.cantidad}`).join(' · ')}
                            </td>
                            <td className="cifra px-3 py-2 text-right text-oro">{eur(c.totalVenta)}</td>
                            <td className="cifra px-3 py-2 text-right text-rojo">{eur(c.totalCoste)}</td>
                            <td
                              className={`cifra px-3 py-2 text-right ${c.beneficioOperativo >= 0 ? 'text-verde' : 'text-rojo'}`}
                            >
                              {eur(c.beneficioOperativo)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {previa.sinReconocer.length > 0 && (
                  <p className="text-[11px] text-tinta-3">
                    Columnas que no se han usado: {previa.sinReconocer.slice(0, 14).join(', ')}
                    {previa.sinReconocer.length > 14 ? '…' : ''}
                  </p>
                )}
                <Boton
                  variante="primario"
                  onClick={() => {
                    previa.operaciones.forEach(guardarOperacion)
                    setAviso(
                      `${previa.operaciones.length} operaciones importadas a la temporada ${temporadaImportacion}.`,
                    )
                    setPrevia(null)
                    setPegado('')
                  }}
                >
                  Importar {previa.operaciones.length} operaciones
                </Boton>
              </>
            )}
          </div>
        )}
      </Panel>

      {/* ------------------------------- Ubicaciones ----------------------------- */}
      <Panel
        titulo="Ubicaciones"
        descripcion="Sugerencias que aparecen al registrar una operación"
      >
        <div className="flex flex-wrap gap-2">
          {estado.ubicaciones.map((u) => (
            <span
              key={u}
              className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-panel-2 py-1 pl-3 pr-1.5 text-xs text-tinta-2"
            >
              {u}
              <button
                type="button"
                onClick={() => guardarUbicaciones(estado.ubicaciones.filter((x) => x !== u))}
                className="rounded-full p-0.5 text-tinta-3 hover:bg-borde hover:text-rojo"
                aria-label={`Eliminar ubicación ${u}`}
              >
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const v = nuevaUbicacion.trim()
            if (!v || estado.ubicaciones.includes(v)) return
            guardarUbicaciones([...estado.ubicaciones, v])
            setNuevaUbicacion('')
          }}
        >
          <Campo etiqueta="Añadir ubicación" className="w-64">
            <Texto
              value={nuevaUbicacion}
              onChange={(e) => setNuevaUbicacion(e.target.value)}
              placeholder="Estepona Sports Complex"
            />
          </Campo>
          <Boton variante="primario" type="submit" disabled={!nuevaUbicacion.trim()}>
            <Plus size={13} /> Anadir
          </Boton>
        </form>
      </Panel>

      {/* --------------------------------- Datos --------------------------------- */}
      <Panel
        titulo="Copia de seguridad y datos"
        descripcion="Los datos se guardan en este navegador. Exporta con regularidad si trabajas en varios equipos."
      >
        <div className="flex flex-wrap gap-2">
          <Boton
            onClick={async () => {
              if ((await descargarJSON(estado)) === 'error') {
                setAviso('No se ha podido descargar la copia de seguridad en este navegador.')
              }
            }}
          >
            <Download size={13} /> Exportar JSON
          </Boton>
          <Boton onClick={() => inputFichero.current?.click()}>
            <Upload size={13} /> Importar JSON
          </Boton>
          <input
            ref={inputFichero}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importar(f)
              e.target.value = ''
            }}
          />
          <Boton variante="peligro" onClick={() => setConfirmarReset(true)}>
            <RotateCcw size={13} /> Restablecer datos originales
          </Boton>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          {[
            ['Operaciones', estado.operaciones.length],
            ['Proveedores', estado.proveedores.length],
            ['Liquidaciones', estado.liquidaciones.length],
            ['Temporadas', estado.temporadas.length],
          ].map(([label, valor]) => (
            <div key={String(label)} className="rounded-xl border border-borde bg-panel-2/40 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-tinta-3">{label}</dt>
              <dd className="cifra mt-1 text-lg font-semibold text-tinta">{valor}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Confirmacion
        abierto={confirmarReset}
        titulo="Restablecer datos originales"
        mensaje="Se descartarán todos los cambios y se volverá a cargar el control operativo original de las temporadas 2025 y 2026. Exporta antes una copia si quieres conservar tu trabajo."
        textoConfirmar="Restablecer"
        onCancelar={() => setConfirmarReset(false)}
        onConfirmar={() => {
          restablecer()
          setConfirmarReset(false)
          setAviso('Datos originales restaurados.')
        }}
      />

      <Confirmacion
        abierto={temporadaABorrar !== null}
        titulo={`Eliminar temporada ${temporadaABorrar?.year ?? ''}`}
        mensaje={
          <>
            Se eliminará la configuración fiscal de la temporada{' '}
            <strong className="text-tinta">{temporadaABorrar?.year}</strong>.
            {temporadaABorrar && contarOperaciones(temporadaABorrar.year) > 0 && (
              <>
                {' '}
                Sus <strong className="text-tinta">{contarOperaciones(temporadaABorrar.year)}</strong>{' '}
                operaciones se conservan, pero pasarán a tributar al 25 % por defecto hasta que vuelvas a crear
                la temporada.
              </>
            )}
          </>
        }
        onCancelar={() => setTemporadaABorrar(null)}
        onConfirmar={() => {
          if (temporadaABorrar) borrarTemporada(temporadaABorrar.year)
          setTemporadaABorrar(null)
        }}
      />
    </div>
  )
}

function FilaConciliacion({
  label,
  declarado,
  calculado,
  diferencia,
  nota,
}: {
  label: string
  declarado: number
  calculado: number
  diferencia: number
  nota?: string
}) {
  const relevante = Math.abs(diferencia) >= 1
  return (
    <tr className="border-b border-borde/60 last:border-0">
      <td className="px-4 py-2.5 text-tinta-2">
        {label}
        {nota && relevante && (
          <span className="ml-2 align-middle">
            <Badge tono="oro">{nota}</Badge>
          </span>
        )}
      </td>
      <td className="cifra px-3 py-2.5 text-right text-tinta-2">{eur(declarado)}</td>
      <td className="cifra px-3 py-2.5 text-right font-medium text-tinta">{eur(calculado)}</td>
      <td
        className={`cifra px-4 py-2.5 text-right ${
          !relevante ? 'text-tinta-3' : diferencia > 0 ? 'text-verde' : 'text-rojo'
        }`}
      >
        {diferencia > 0 ? '+' : ''}
        {eur(diferencia)}
      </td>
    </tr>
  )
}
