import { useState } from 'react'
import { aMin } from '../lib/agenda'
import { COLOR_POR_DEFECTO } from '../lib/colores'
import type { Evento } from '../lib/db'
import { borrarEvento, guardarEvento, type DatosEvento } from '../lib/rutinaDb'
import { botonPeligro, campo, Dialogo, Error, etiqueta, SelectorColor, SelectorHora } from './ui'

export default function FormularioEvento({ evento, fecha, alCerrar }: { evento?: Evento; fecha: string; alCerrar: () => void }) {
  const [d, setD] = useState<DatosEvento>({
    titulo: evento?.titulo ?? '',
    fecha: evento?.fecha ?? fecha,
    inicio: evento?.inicio ?? null,
    fin: evento?.fin ?? null,
    repeticion: evento?.repeticion ?? 'ninguna',
    color: evento?.color ?? COLOR_POR_DEFECTO,
  })
  const [error, setError] = useState('')
  const set = <K extends keyof DatosEvento>(k: K, v: DatosEvento[K]) => setD((x) => ({ ...x, [k]: v }))
  const todoElDia = d.inicio === null

  const guardar = async () => {
    if (!d.titulo.trim()) return setError('Poné un título.')
    if (!d.fecha) return setError('Elegí una fecha.')
    if (!todoElDia && aMin(d.fin!) <= aMin(d.inicio!)) return setError('La hora de fin tiene que ser posterior a la de inicio.')
    await guardarEvento({ ...d, titulo: d.titulo.trim() }, evento?.id)
    alCerrar()
  }

  const borrar = async () => {
    await borrarEvento(evento!.id)
    alCerrar()
  }

  return (
    <Dialogo
      titulo={evento ? 'Editar evento' : 'Nuevo evento'}
      alCerrar={alCerrar}
      alEnviar={guardar}
      pie={evento && <button type="button" className={`${botonPeligro} mr-auto`} onClick={borrar}>Borrar</button>}
    >
      <div>
        <label htmlFor="e-titulo" className={etiqueta}>Título</label>
        <input id="e-titulo" className={`${campo} w-full`} value={d.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej.: Parcial de Tráfico, turno médico, cumpleaños" autoFocus />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="e-fecha" className={etiqueta}>Fecha</label>
          <input id="e-fecha" type="date" className={campo} value={d.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </div>
        <div>
          <label htmlFor="e-rep" className={etiqueta}>Se repite</label>
          <select id="e-rep" className={`${campo} w-44`} value={d.repeticion} onChange={(e) => set('repeticion', e.target.value as Evento['repeticion'])}>
            <option value="ninguna">No se repite</option>
            <option value="semanal">Cada semana</option>
            <option value="mensual">Cada mes</option>
            <option value="anual">Cada año</option>
          </select>
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--color-acento)]"
          checked={todoElDia}
          onChange={(e) => setD((x) => ({ ...x, inicio: e.target.checked ? null : '09:00', fin: e.target.checked ? null : '10:00' }))}
        />
        Todo el día
      </label>
      {!todoElDia && (
        <div className="-mt-2 flex gap-4">
          <SelectorHora id="e-inicio" etiquetaTexto="Desde" valor={d.inicio!} alCambiar={(h) => set('inicio', h)} />
          <SelectorHora id="e-fin" etiquetaTexto="Hasta" valor={d.fin!} alCambiar={(h) => set('fin', h)} />
        </div>
      )}

      <SelectorColor valor={d.color} alCambiar={(c) => set('color', c)} />
      <Error texto={error} />
    </Dialogo>
  )
}
