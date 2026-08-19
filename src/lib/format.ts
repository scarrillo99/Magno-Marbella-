const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const EUR_COMPACTO = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const NUM = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

export const eur = (n: number): string => EUR.format(Number.isFinite(n) ? n : 0)
export const eur0 = (n: number): string => EUR_COMPACTO.format(Number.isFinite(n) ? n : 0)
export const num = (n: number): string => NUM.format(Number.isFinite(n) ? n : 0)

export const pct = (n: number, decimales = 1): string =>
  `${(Number.isFinite(n) ? n * 100 : 0).toFixed(decimales).replace('.', ',')} %`

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** yyyy-mm-dd -> "12 mar 2025" (sin pasar por Date, para evitar saltos de zona horaria). */
export function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return iso || '—'
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}`
}

/** yyyy-mm -> "mar 2025" */
export function periodoCorto(periodo: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(periodo || '')
  if (!m) return periodo
  return `${MESES[Number(m[2]) - 1]} ${m[1]}`
}

export const hoyISO = (): string => new Date().toISOString().slice(0, 10)

/** Acepta "1.234,56", "1234.56" o "1234,56" y devuelve un number. */
export function parseNumero(raw: string): number {
  if (typeof raw !== 'string') return 0
  const limpio = raw.trim().replace(/[€\s]/g, '')
  if (!limpio) return 0
  const normalizado =
    limpio.includes(',') && limpio.lastIndexOf(',') > limpio.lastIndexOf('.')
      ? limpio.replace(/\./g, '').replace(',', '.')
      : limpio.replace(/,/g, '')
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}
