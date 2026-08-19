import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  type AppState,
  type Cliente,
  type Liquidacion,
  type Operacion,
  type Proveedor,
  type Tarifa,
  type Temporada,
} from '../types'
import { estadoInicial } from '../data/seed'
import { cargarEstado, guardarEstado, limpiarEstado, normalizarEstado } from '../lib/storage'
import { uid } from '../lib/id'
import { hoyISO } from '../lib/format'

/** Temporada seleccionada en el filtro global. `'todas'` agrega todo el histórico. */
export type FiltroTemporada = number | 'todas'

interface Store {
  estado: AppState
  temporadaSel: FiltroTemporada
  setTemporadaSel: (t: FiltroTemporada) => void

  /** Operaciones de la temporada seleccionada. */
  operacionesFiltradas: Operacion[]
  liquidacionesFiltradas: Liquidacion[]
  /** Tarifas de la temporada seleccionada (todas si el filtro es «todas»). */
  tarifasFiltradas: Tarifa[]

  crearOperacion: (parcial?: Partial<Operacion>) => Operacion
  guardarOperacion: (op: Operacion) => void
  actualizarOperacion: (id: string, cambios: Partial<Operacion>) => void
  borrarOperacion: (id: string) => void
  duplicarOperacion: (id: string) => void

  guardarProveedor: (p: Proveedor) => void
  borrarProveedor: (id: string) => void

  guardarLiquidacion: (l: Liquidacion) => void
  borrarLiquidacion: (id: string) => void

  guardarCliente: (c: Cliente) => Cliente
  borrarCliente: (id: string) => void

  guardarTarifa: (t: Tarifa) => void
  borrarTarifa: (id: string) => void
  /** Copia el tarifario de una temporada a otra, sin pisar lo ya existente. */
  copiarTarifas: (origen: number, destino: number) => number

  guardarTemporada: (t: Temporada) => void
  borrarTemporada: (year: number) => void

  guardarUbicaciones: (u: string[]) => void

  importarEstado: (raw: unknown) => void
  restablecer: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  // Una sola lectura de localStorage: la comparten el estado y el filtro inicial.
  const inicial = useRef<AppState | null>(null)
  if (inicial.current === null) inicial.current = cargarEstado()

  const [estado, setEstado] = useState<AppState>(inicial.current)
  const [temporadaSel, setTemporadaSel] = useState<FiltroTemporada>(
    inicial.current.temporadas.at(-1)?.year ?? 'todas',
  )

  useEffect(() => {
    guardarEstado(estado)
  }, [estado])

  // Si se borra la temporada seleccionada, volvemos a una vista válida.
  useEffect(() => {
    if (temporadaSel !== 'todas' && !estado.temporadas.some((t) => t.year === temporadaSel)) {
      setTemporadaSel('todas')
    }
  }, [estado.temporadas, temporadaSel])

  const operacionesFiltradas = useMemo(
    () =>
      temporadaSel === 'todas'
        ? estado.operaciones
        : estado.operaciones.filter((o) => o.temporada === temporadaSel),
    [estado.operaciones, temporadaSel],
  )

  const liquidacionesFiltradas = useMemo(
    () =>
      temporadaSel === 'todas'
        ? estado.liquidaciones
        : estado.liquidaciones.filter((l) => l.temporada === temporadaSel),
    [estado.liquidaciones, temporadaSel],
  )

  const tarifasFiltradas = useMemo(
    () =>
      temporadaSel === 'todas'
        ? estado.tarifas
        : estado.tarifas.filter((t) => t.temporada === temporadaSel),
    [estado.tarifas, temporadaSel],
  )

  const crearOperacion = useCallback<Store['crearOperacion']>(
    (parcial) => {
      const year =
        parcial?.temporada ??
        (temporadaSel === 'todas' ? estado.temporadas.at(-1)?.year ?? new Date().getFullYear() : temporadaSel)
      const cfg = estado.temporadas.find((t) => t.year === year)
      const correlativo = estado.operaciones.filter((o) => o.temporada === year).length + 1
      // Al abrir una temporada distinta del año en curso, la fecha de hoy
      // dejaria la operación fuera de su propia temporada.
      const hoy = hoyISO()
      const fecha = hoy.startsWith(String(year)) ? hoy : `${year}-01-01`
      return {
        id: uid('op'),
        numeroFactura: `MM-${year}-${String(correlativo).padStart(3, '0')}`,
        fecha,
        temporada: year,
        ubicacion: estado.ubicaciones[0] ?? '',
        jugador: '',
        lineas: [],
        feePct: cfg?.feePct ?? 0.2,
        pagado: 0,
        notas: '',
        ...parcial,
      }
    },
    [estado.operaciones, estado.temporadas, estado.ubicaciones, temporadaSel],
  )

  const guardarOperacion = useCallback<Store['guardarOperacion']>((op) => {
    setEstado((prev) => {
      const existe = prev.operaciones.some((o) => o.id === op.id)
      return {
        ...prev,
        operaciones: existe
          ? prev.operaciones.map((o) => (o.id === op.id ? op : o))
          : [...prev.operaciones, op],
      }
    })
  }, [])

  const actualizarOperacion = useCallback<Store['actualizarOperacion']>((id, cambios) => {
    setEstado((prev) => ({
      ...prev,
      operaciones: prev.operaciones.map((o) => (o.id === id ? { ...o, ...cambios } : o)),
    }))
  }, [])

  const borrarOperacion = useCallback<Store['borrarOperacion']>((id) => {
    setEstado((prev) => ({ ...prev, operaciones: prev.operaciones.filter((o) => o.id !== id) }))
  }, [])

  const duplicarOperacion = useCallback<Store['duplicarOperacion']>((id) => {
    setEstado((prev) => {
      const origen = prev.operaciones.find((o) => o.id === id)
      if (!origen) return prev
      const copia: Operacion = {
        ...origen,
        id: uid('op'),
        numeroFactura: `${origen.numeroFactura}-COPIA`,
        pagado: 0,
        lineas: origen.lineas.map((l) => ({ ...l, id: uid('lin') })),
      }
      const i = prev.operaciones.findIndex((o) => o.id === id)
      const operaciones = [...prev.operaciones]
      operaciones.splice(i + 1, 0, copia)
      return { ...prev, operaciones }
    })
  }, [])

  const guardarProveedor = useCallback<Store['guardarProveedor']>((p) => {
    setEstado((prev) => ({
      ...prev,
      proveedores: prev.proveedores.some((x) => x.id === p.id)
        ? prev.proveedores.map((x) => (x.id === p.id ? p : x))
        : [...prev.proveedores, p],
    }))
  }, [])

  const borrarProveedor = useCallback<Store['borrarProveedor']>((id) => {
    setEstado((prev) => ({
      ...prev,
      proveedores: prev.proveedores.filter((p) => p.id !== id),
      liquidaciones: prev.liquidaciones.filter((l) => l.proveedorId !== id),
      // Las operaciones conservan su coste; solo pierden la referencia al proveedor.
      operaciones: prev.operaciones.map((o) => ({
        ...o,
        lineas: o.lineas.map((l) => (l.proveedorId === id ? { ...l, proveedorId: null } : l)),
      })),
    }))
  }, [])

  const guardarLiquidacion = useCallback<Store['guardarLiquidacion']>((l) => {
    setEstado((prev) => ({
      ...prev,
      liquidaciones: prev.liquidaciones.some((x) => x.id === l.id)
        ? prev.liquidaciones.map((x) => (x.id === l.id ? l : x))
        : [...prev.liquidaciones, l],
    }))
  }, [])

  const borrarLiquidacion = useCallback<Store['borrarLiquidacion']>((id) => {
    setEstado((prev) => ({ ...prev, liquidaciones: prev.liquidaciones.filter((l) => l.id !== id) }))
  }, [])

  const guardarCliente = useCallback<Store['guardarCliente']>((c) => {
    setEstado((prev) => ({
      ...prev,
      clientes: prev.clientes.some((x) => x.id === c.id)
        ? prev.clientes.map((x) => (x.id === c.id ? c : x))
        : [...prev.clientes, c],
    }))
    return c
  }, [])

  const borrarCliente = useCallback<Store['borrarCliente']>((id) => {
    // Las operaciones guardan el nombre del jugador, así que no se pierden
    // al dar de baja la ficha.
    setEstado((prev) => ({ ...prev, clientes: prev.clientes.filter((c) => c.id !== id) }))
  }, [])

  const guardarTarifa = useCallback<Store['guardarTarifa']>((t) => {
    setEstado((prev) => ({
      ...prev,
      tarifas: prev.tarifas.some((x) => x.id === t.id)
        ? prev.tarifas.map((x) => (x.id === t.id ? t : x))
        : [...prev.tarifas, t],
    }))
  }, [])

  const borrarTarifa = useCallback<Store['borrarTarifa']>((id) => {
    setEstado((prev) => ({ ...prev, tarifas: prev.tarifas.filter((t) => t.id !== id) }))
  }, [])

  const copiarTarifas = useCallback<Store['copiarTarifas']>((origen, destino) => {
    let copiadas = 0
    setEstado((prev) => {
      const yaHay = new Set(
        prev.tarifas
          .filter((t) => t.temporada === destino)
          .map((t) => `${t.servicio}|${t.proveedorId ?? ''}|${t.concepto}`),
      )
      const nuevas = prev.tarifas
        .filter((t) => t.temporada === origen)
        .filter((t) => !yaHay.has(`${t.servicio}|${t.proveedorId ?? ''}|${t.concepto}`))
        .map((t) => ({ ...t, id: uid('tar'), temporada: destino }))
      copiadas = nuevas.length
      return nuevas.length === 0 ? prev : { ...prev, tarifas: [...prev.tarifas, ...nuevas] }
    })
    return copiadas
  }, [])

  const guardarTemporada = useCallback<Store['guardarTemporada']>((t) => {
    setEstado((prev) => ({
      ...prev,
      temporadas: (prev.temporadas.some((x) => x.year === t.year)
        ? prev.temporadas.map((x) => (x.year === t.year ? t : x))
        : [...prev.temporadas, t]
      ).sort((a, b) => a.year - b.year),
    }))
  }, [])

  const borrarTemporada = useCallback<Store['borrarTemporada']>((year) => {
    setEstado((prev) => ({ ...prev, temporadas: prev.temporadas.filter((t) => t.year !== year) }))
  }, [])

  const guardarUbicaciones = useCallback<Store['guardarUbicaciones']>((u) => {
    setEstado((prev) => ({ ...prev, ubicaciones: u }))
  }, [])

  const importarEstado = useCallback<Store['importarEstado']>((raw) => {
    setEstado(normalizarEstado(raw))
  }, [])

  const restablecer = useCallback<Store['restablecer']>(() => {
    limpiarEstado()
    setEstado(estadoInicial())
  }, [])

  const value = useMemo<Store>(
    () => ({
      estado,
      temporadaSel,
      setTemporadaSel,
      operacionesFiltradas,
      liquidacionesFiltradas,
      tarifasFiltradas,
      crearOperacion,
      guardarOperacion,
      actualizarOperacion,
      borrarOperacion,
      duplicarOperacion,
      guardarProveedor,
      borrarProveedor,
      guardarLiquidacion,
      borrarLiquidacion,
      guardarCliente,
      borrarCliente,
      guardarTarifa,
      borrarTarifa,
      copiarTarifas,
      guardarTemporada,
      borrarTemporada,
      guardarUbicaciones,
      importarEstado,
      restablecer,
    }),
    [
      estado,
      temporadaSel,
      operacionesFiltradas,
      liquidacionesFiltradas,
      tarifasFiltradas,
      crearOperacion,
      guardarOperacion,
      actualizarOperacion,
      borrarOperacion,
      duplicarOperacion,
      guardarProveedor,
      borrarProveedor,
      guardarLiquidacion,
      borrarLiquidacion,
      guardarTemporada,
      borrarTemporada,
      guardarUbicaciones,
      importarEstado,
      restablecer,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>')
  return ctx
}
