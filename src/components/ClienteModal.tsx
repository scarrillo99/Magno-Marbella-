import { useState } from 'react'
import type { Cliente } from '../types'
import { uid } from '../lib/id'
import { Boton, Campo, Modal, Selector, Texto } from '../components/ui'
import { useStore } from '../store/store'

export const clienteVacio = (nombre = ''): Cliente => ({
  id: uid('cli'),
  nombre,
  cif: '',
  agencia: '',
  contacto: '',
  club: '',
  notas: '',
  activo: true,
})

/** Ficha de cliente, compartida por la sección Jugadores y el alta de operación. */
export function ClienteModal({
  cliente,
  onGuardar,
  onCerrar,
}: {
  cliente: Cliente | null
  onGuardar: (c: Cliente) => void
  onCerrar: () => void
}) {
  const { estado } = useStore()
  const [borrador, setBorrador] = useState<Cliente | null>(cliente)
  const clave = cliente?.id ?? 'ninguno'
  const [claveActual, setClaveActual] = useState(clave)
  if (claveActual !== clave) {
    setClaveActual(clave)
    setBorrador(cliente)
  }

  if (!borrador) return null
  const set = (c: Partial<Cliente>) => setBorrador({ ...borrador, ...c })

  const agencias = [...new Set(estado.clientes.map((c) => c.agencia).filter(Boolean))]
  const duplicado = estado.clientes.some(
    (c) => c.id !== borrador.id && c.nombre.trim().toLowerCase() === borrador.nombre.trim().toLowerCase(),
  )

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={cliente?.nombre ? `Cliente · ${cliente.nombre}` : 'Nuevo cliente'}
      ancho="max-w-2xl"
      pie={
        <>
          {duplicado && (
            <span className="mr-auto text-xs text-rojo">Ya existe un cliente con ese nombre.</span>
          )}
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            disabled={!borrador.nombre.trim() || duplicado}
            onClick={() => onGuardar({ ...borrador, nombre: borrador.nombre.trim() })}
          >
            Guardar cliente
          </Boton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre" className="sm:col-span-2">
          <Texto
            value={borrador.nombre}
            onChange={(e) => set({ nombre: e.target.value })}
            placeholder="Nombre del jugador"
            autoFocus
          />
        </Campo>
        <Campo etiqueta="CIF / NIF">
          <Texto value={borrador.cif} onChange={(e) => set({ cif: e.target.value })} placeholder="B12345678" />
        </Campo>
        <Campo etiqueta="Agencia / representante">
          <Texto
            value={borrador.agencia}
            onChange={(e) => set({ agencia: e.target.value })}
            list="lista-agencias"
            placeholder="Rogon, Stellar…"
          />
          <datalist id="lista-agencias">
            {agencias.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Campo>
        <Campo etiqueta="Club">
          <Texto value={borrador.club} onChange={(e) => set({ club: e.target.value })} />
        </Campo>
        <Campo etiqueta="Contacto" className="sm:col-span-2">
          <Texto
            value={borrador.contacto}
            onChange={(e) => set({ contacto: e.target.value })}
            placeholder="email o teléfono"
          />
        </Campo>
        <Campo etiqueta="Notas" className="sm:col-span-2">
          <textarea
            value={borrador.notas}
            onChange={(e) => set({ notas: e.target.value })}
            rows={2}
            className="campo resize-y"
            placeholder="Preferencias, idioma, condiciones acordadas…"
          />
        </Campo>
        <Campo etiqueta="Estado" className="sm:col-span-2">
          <Selector
            value={borrador.activo ? 'si' : 'no'}
            onChange={(e) => set({ activo: e.target.value === 'si' })}
            opciones={[
              { valor: 'si', texto: 'Activo' },
              { valor: 'no', texto: 'Inactivo' },
            ]}
          />
        </Campo>
      </div>
    </Modal>
  )
}
