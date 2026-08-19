import type { ReactNode } from 'react'
import { Barra } from './ui'

export type TonoKpi = 'oro' | 'verde' | 'rojo' | 'azul' | 'violeta' | 'cian' | 'neutro'

const COLOR: Record<TonoKpi, string> = {
  oro: 'var(--color-oro)',
  verde: 'var(--color-verde)',
  rojo: 'var(--color-rojo)',
  azul: 'var(--color-azul)',
  violeta: 'var(--color-violeta)',
  cian: 'var(--color-cian)',
  neutro: 'var(--color-tinta-2)',
}

export function KpiCard({
  etiqueta,
  valor,
  nota,
  tono = 'neutro',
  icono,
  progreso,
  destacado = false,
}: {
  etiqueta: string
  valor: string
  nota?: ReactNode
  tono?: TonoKpi
  icono?: ReactNode
  /** 0..1 — dibuja una barra de contexto bajo la cifra. */
  progreso?: number
  destacado?: boolean
}) {
  const color = COLOR[tono]
  return (
    <div
      className={`panel relative overflow-hidden p-4 transition-transform duration-200 hover:-translate-y-0.5 ${
        destacado ? 'ring-1 ring-oro/30' : ''
      }`}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-tinta-3">{etiqueta}</p>
        {icono && (
          <span className="shrink-0 rounded-lg p-1.5" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
            {icono}
          </span>
        )}
      </div>
      <p className="cifra mt-2 text-[1.6rem] leading-tight font-semibold tracking-tight" style={{ color }}>
        {valor}
      </p>
      {progreso !== undefined && (
        <div className="mt-2.5">
          <Barra valor={progreso} color={color} />
        </div>
      )}
      {nota && <div className="mt-2 text-[11px] leading-relaxed text-tinta-2">{nota}</div>}
    </div>
  )
}
