import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { X } from 'lucide-react'
import { parseNumero } from '../lib/format'

/* ------------------------------- Contenedores ------------------------------ */

export function Panel({
  titulo,
  descripcion,
  acciones,
  children,
  className = '',
  sinPadding = false,
}: {
  titulo?: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  children: ReactNode
  className?: string
  sinPadding?: boolean
}) {
  return (
    <section className={`panel ${className}`}>
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-borde px-5 py-4">
          <div className="min-w-0">
            {titulo && <h2 className="text-sm font-semibold tracking-wide text-tinta">{titulo}</h2>}
            {descripcion && <p className="mt-0.5 text-xs text-tinta-2">{descripcion}</p>}
          </div>
          {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className={sinPadding ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

/* --------------------------------- Botones -------------------------------- */

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-oro text-lienzo hover:bg-oro-suave font-semibold shadow-[0_2px_14px_-4px_rgba(217,180,81,0.5)]',
  secundario: 'bg-panel-2 text-tinta hover:bg-borde border border-borde-fuerte',
  fantasma: 'text-tinta-2 hover:text-tinta hover:bg-panel-2 border border-transparent',
  peligro: 'bg-rojo/12 text-rojo hover:bg-rojo/20 border border-rojo/35',
}

export function Boton({
  variante = 'secundario',
  className = '',
  children,
  ...props
}: { variante?: Variante } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </button>
  )
}

/* --------------------------------- Etiquetas ------------------------------- */

export function Badge({
  children,
  tono = 'neutro',
}: {
  children: ReactNode
  tono?: 'neutro' | 'verde' | 'rojo' | 'oro' | 'azul' | 'violeta'
}) {
  const tonos = {
    neutro: 'bg-panel-2 text-tinta-2 border-borde-fuerte',
    verde: 'bg-verde/12 text-verde border-verde/30',
    rojo: 'bg-rojo/12 text-rojo border-rojo/30',
    oro: 'bg-oro/12 text-oro border-oro/30',
    azul: 'bg-azul/12 text-azul border-azul/30',
    violeta: 'bg-violeta/12 text-violeta border-violeta/30',
  }
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${tonos[tono]}`}
    >
      {children}
    </span>
  )
}

/* --------------------------------- Campos --------------------------------- */

export function Campo({
  etiqueta,
  ayuda,
  children,
  className = '',
}: {
  etiqueta: string
  ayuda?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-tinta-3">
        {etiqueta}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-tinta-3">{ayuda}</span>}
    </label>
  )
}

export function Texto(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`campo ${props.className ?? ''}`} />
}

export function Selector({
  opciones,
  ...props
}: { opciones: { valor: string; texto: string }[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`campo ${props.className ?? ''}`}>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor} className="bg-panel">
          {o.texto}
        </option>
      ))}
    </select>
  )
}

/**
 * Entrada numerica que admite formato español ("1.234,56") y solo propaga el
 * valor al confirmar, para no reformatear el texto mientras se escribe.
 */
export function NumeroInput({
  valor,
  onValor,
  decimales = 2,
  className = '',
  claseContenedor = '',
  sufijo,
  ...props
}: {
  valor: number
  onValor: (n: number) => void
  decimales?: number
  sufijo?: string
  className?: string
  /** Ancho del contenedor; el sufijo se ancla a su borde derecho. */
  claseContenedor?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const formatear = (n: number) =>
    n === 0 ? '' : n.toLocaleString('es-ES', { maximumFractionDigits: decimales })
  const [texto, setTexto] = useState(() => formatear(valor))
  const enfocado = useRef(false)

  useEffect(() => {
    if (!enfocado.current) setTexto(formatear(valor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  const confirmar = () => {
    enfocado.current = false
    const n = parseNumero(texto)
    setTexto(formatear(n))
    if (n !== valor) onValor(n)
  }

  return (
    <div className={`relative ${claseContenedor}`}>
      <input
        placeholder="0"
        {...props}
        inputMode="decimal"
        value={texto}
        onFocus={(e) => {
          enfocado.current = true
          e.currentTarget.select()
        }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setTexto(formatear(valor))
            enfocado.current = false
            e.currentTarget.blur()
          }
        }}
        className={`${className} ${sufijo ? 'pr-6' : ''}`}
      />
      {sufijo && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-tinta-3">
          {sufijo}
        </span>
      )}
    </div>
  )
}

/* ---------------------------------- Modal --------------------------------- */

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = 'max-w-3xl',
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: ReactNode
  descripcion?: ReactNode
  children: ReactNode
  pie?: ReactNode
  ancho?: string
}) {
  const tituloId = useId()

  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKey)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowPrevio
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-lienzo/80 p-4 backdrop-blur-sm sm:p-8">
      <div className="absolute inset-0" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`panel animar-entrada relative my-auto w-full ${ancho} shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
          <div>
            <h2 id={tituloId} className="text-base font-semibold text-tinta">
              {titulo}
            </h2>
            {descripcion && <p className="mt-0.5 text-xs text-tinta-2">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-tinta-3 transition-colors hover:bg-panel-2 hover:text-tinta"
          >
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-5 py-4">{children}</div>
        {pie && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-borde px-5 py-3">
            {pie}
          </footer>
        )}
      </div>
    </div>
  )
}

/* ------------------------------- Confirmacion ------------------------------ */

export function Confirmacion({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Eliminar',
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean
  titulo: string
  mensaje: ReactNode
  textoConfirmar?: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCancelar}
      titulo={titulo}
      ancho="max-w-md"
      pie={
        <>
          <Boton variante="fantasma" onClick={onCancelar}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={onConfirmar}>
            {textoConfirmar}
          </Boton>
        </>
      }
    >
      <p className="text-sm text-tinta-2">{mensaje}</p>
    </Modal>
  )
}

/* -------------------------------- Vacio / info ----------------------------- */

export function Vacio({ titulo, mensaje, accion }: { titulo: string; mensaje: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium text-tinta">{titulo}</p>
      <p className="max-w-md text-xs text-tinta-2">{mensaje}</p>
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}

/** Barra de progreso horizontal para comparar pesos dentro de una tabla. */
export function Barra({ valor, color = 'var(--color-oro)' }: { valor: number; color?: string }) {
  const ancho = Math.max(0, Math.min(1, Number.isFinite(valor) ? valor : 0)) * 100
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-borde">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${ancho}%`, background: color }}
      />
    </div>
  )
}
