let contador = 0

/** Identificador estable y único para registros creados en cliente. */
export function uid(prefijo = 'id'): string {
  contador += 1
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefijo}_${Date.now().toString(36)}${contador.toString(36)}${rnd}`
}
