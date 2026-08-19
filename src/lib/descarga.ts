/**
 * Descarga de ficheros generados en el navegador.
 *
 * En un navegador normal se usa un enlace con un blob. Cuando la página se
 * publica como Artifact de claude.ai, el visor bloquea esas descargas y hay
 * que pedirlas a través de su runtime, que muestra una confirmación al
 * usuario. Este helper elige la vía disponible sin que lo note el resto de
 * la aplicación.
 */

export type ResultadoDescarga = 'guardado' | 'cancelado' | 'error'

interface ErrorDescarga {
  code?: string
  message?: string
}

interface RuntimeClaude {
  use?: (nombre: string) => Promise<{ save: (p: { filename: string; data: string }) => Promise<unknown> } | null>
}

async function runtimeDeArtifact() {
  const claude = (window as unknown as { claude?: RuntimeClaude }).claude
  if (!claude?.use) return null
  try {
    return await claude.use('downloads')
  } catch {
    return null
  }
}

function descargarConEnlace(nombre: string, contenido: string, mime: string): ResultadoDescarga {
  try {
    const url = URL.createObjectURL(new Blob([contenido], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    URL.revokeObjectURL(url)
    return 'guardado'
  } catch {
    return 'error'
  }
}

export async function descargarFichero(
  nombre: string,
  contenido: string,
  mime: string,
): Promise<ResultadoDescarga> {
  const descargas = await runtimeDeArtifact()
  if (!descargas) return descargarConEnlace(nombre, contenido, mime)

  try {
    await descargas.save({ filename: nombre, data: contenido })
    return 'guardado'
  } catch (e) {
    const { code } = (e ?? {}) as ErrorDescarga
    if (code === 'declined') return 'cancelado'
    // El visor puede no admitir la extensión (por ejemplo .csv): se ofrece
    // el mismo contenido como texto plano, que siempre está permitido.
    if (code === 'rejected_extension' || code === 'extension_not_enabled') {
      try {
        await descargas.save({ filename: `${nombre.replace(/\.[^.]+$/, '')}.txt`, data: contenido })
        return 'guardado'
      } catch (e2) {
        return ((e2 ?? {}) as ErrorDescarga).code === 'declined' ? 'cancelado' : 'error'
      }
    }
    return 'error'
  }
}

export const nombreConFecha = (base: string, extension: string): string =>
  `${base}-${new Date().toISOString().slice(0, 10)}.${extension}`
