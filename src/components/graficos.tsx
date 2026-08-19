import type { ReactNode } from 'react'
import { eur } from '../lib/format'

export const PALETA = [
  'var(--color-oro)',
  'var(--color-azul)',
  'var(--color-verde)',
  'var(--color-violeta)',
  'var(--color-cian)',
  'var(--color-rojo)',
  '#e0864f',
  '#7d8bb0',
]

export const EJE = {
  stroke: 'var(--color-tinta-3)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

export const REJILLA = {
  stroke: 'var(--color-borde)',
  strokeDasharray: '3 3',
  vertical: false,
} as const

/** Tooltip unificado para todos los gráficos del panel. */
export function TooltipCaja({
  active,
  payload,
  label,
  formateador = eur,
  etiquetador,
}: {
  active?: boolean
  payload?: { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }[]
  label?: string | number
  formateador?: (n: number) => string
  etiquetador?: (label: string | number | undefined) => ReactNode
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="panel px-3 py-2 shadow-xl">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-tinta-2">
        {etiquetador ? etiquetador(label) : label}
      </p>
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-tinta-2">{p.name}</span>
            <span className="cifra ml-auto font-medium text-tinta">
              {typeof p.value === 'number' ? formateador(p.value) : p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
