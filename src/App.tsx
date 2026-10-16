import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Building2,
  CalendarRange,
  ClipboardList,
  Menu,
  Receipt,
  Settings,
  Tags,
  Trophy,
  X,
} from 'lucide-react'
import { StoreProvider, useStore, type FiltroTemporada } from './store/store'
import { Dashboard } from './pages/Dashboard'
import { Operaciones } from './pages/Operaciones'
import { Jugadores } from './pages/Jugadores'
import { Proveedores } from './pages/Proveedores'
import { Tarifas } from './pages/Tarifas'
import { Facturacion } from './pages/Facturacion'
import { Ajustes } from './pages/Ajustes'

const SECCIONES = [
  { id: 'dashboard', nombre: 'Dashboard', icono: BarChart3, desc: 'KPIs y análisis' },
  { id: 'operaciones', nombre: 'Operaciones', icono: ClipboardList, desc: 'Registros por jugador' },
  { id: 'facturacion', nombre: 'Facturación', icono: Receipt, desc: 'Libros de IVA' },
  { id: 'jugadores', nombre: 'Jugadores', icono: Trophy, desc: 'Clientes y rentabilidad' },
  { id: 'proveedores', nombre: 'Proveedores', icono: Building2, desc: 'Costes y liquidaciones' },
  { id: 'tarifas', nombre: 'Tarifas', icono: Tags, desc: 'Precios por servicio' },
  { id: 'ajustes', nombre: 'Ajustes', icono: Settings, desc: 'Temporadas y datos' },
] as const

type SeccionId = (typeof SECCIONES)[number]['id']

const esSeccion = (v: string): v is SeccionId => SECCIONES.some((s) => s.id === v)

function Shell() {
  const { estado, temporadaSel, setTemporadaSel, operacionesFiltradas } = useStore()
  const [seccion, setSeccion] = useState<SeccionId>(() => {
    const h = window.location.hash.replace('#', '')
    return esSeccion(h) ? h : 'dashboard'
  })
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    window.location.hash = seccion
    setMenuAbierto(false)
  }, [seccion])

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace('#', '')
      if (esSeccion(h)) setSeccion(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const opcionesTemporada = useMemo<{ valor: string; texto: string }[]>(
    () => [
      { valor: 'todas', texto: 'Todas las temporadas' },
      ...estado.temporadas.map((t) => ({ valor: String(t.year), texto: `Temporada ${t.year}` })),
    ],
    [estado.temporadas],
  )

  const actual = SECCIONES.find((s) => s.id === seccion)!

  return (
    <div className="flex min-h-screen">
      {/* --------------------------------- Sidebar -------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-borde bg-panel/95 backdrop-blur-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-borde px-5 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-oro font-bold text-lienzo">
                M
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-tinta">Magno Marbella</p>
                <p className="truncate text-[11px] text-tinta-3">Entrenos Sports Services</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            className="rounded-lg p-1.5 text-tinta-3 hover:bg-panel-2 hover:text-tinta lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {SECCIONES.map((s) => {
            const Icono = s.icono
            const activo = s.id === seccion
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeccion(s.id)}
                aria-current={activo ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  activo
                    ? 'bg-oro/12 text-oro ring-1 ring-oro/25'
                    : 'text-tinta-2 hover:bg-panel-2 hover:text-tinta'
                }`}
              >
                <Icono size={17} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{s.nombre}</span>
                  <span className="block truncate text-[11px] text-tinta-3">{s.desc}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-borde px-4 py-3">
          <p className="text-[11px] text-tinta-3">
            {operacionesFiltradas.length} {operacionesFiltradas.length === 1 ? 'operación' : 'operaciones'} en vista ·{' '}
            {estado.operaciones.length} en total
          </p>
        </div>
      </aside>

      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-lienzo/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden
        />
      )}

      {/* ------------------------------- Contenido -------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-borde bg-lienzo/85 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuAbierto(true)}
                className="rounded-lg border border-borde p-2 text-tinta-2 hover:text-tinta lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu size={16} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-tinta">{actual.nombre}</h1>
                <p className="truncate text-[11px] text-tinta-3">{actual.desc}</p>
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-borde bg-panel px-3 py-1.5">
              <CalendarRange size={15} className="shrink-0 text-oro" />
              <span className="sr-only">Filtro global de temporada</span>
              <select
                value={String(temporadaSel)}
                onChange={(e) =>
                  setTemporadaSel(
                    (e.target.value === 'todas' ? 'todas' : Number(e.target.value)) as FiltroTemporada,
                  )
                }
                className="bg-transparent text-sm font-medium text-tinta focus:outline-none"
              >
                {opcionesTemporada.map((o) => (
                  <option key={o.valor} value={o.valor} className="bg-panel">
                    {o.texto}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <main key={seccion} className="animar-entrada flex-1 px-4 py-6 sm:px-6">
          {seccion === 'dashboard' && <Dashboard />}
          {seccion === 'operaciones' && <Operaciones />}
          {seccion === 'jugadores' && <Jugadores />}
          {seccion === 'proveedores' && <Proveedores />}
          {seccion === 'tarifas' && <Tarifas />}
          {seccion === 'facturacion' && <Facturacion />}
          {seccion === 'ajustes' && <Ajustes />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
