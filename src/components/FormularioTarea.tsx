import { useState } from 'react'
import type { Tarea } from '../lib/db'
import { cambiarTarea, guardarTarea, type DatosTarea } from '../lib/rutinaDb'
import { botonPeligro, campo, Dialogo, Error, etiqueta } from './ui'

export default function FormularioTarea({ tarea, fecha, alCerrar }: { tarea?: Tarea; fecha?: string; alCerrar: () => void }) {
  const [d, setD] = useState<DatosTarea>({
    titulo: tarea?.titulo ?? '',
    fechaLimite: tarea?.fechaLimite ?? fecha ?? null,
    prioridad: tarea?.prioridad ?? 'media',
    estado: tarea?.estado ?? 'pendiente',
  })
  const [error, setError] = useState('')
  const set = <K extends keyof DatosTarea>(k: K, v: DatosTarea[K]) => setD((x) => ({ ...x, [k]: v }))

  const guardar = async () => {
    if (!d.titulo.trim()) return setError('Poné un título.')
    await guardarTarea({ ...d, titulo: d.titulo.trim() }, tarea?.id)
    alCerrar()
  }

  const borrar = async () => {
    await cambiarTarea(tarea!.id, { borrado: true })
    alCerrar()
  }

  return (
    <Dialogo
      titulo={tarea ? 'Editar tarea' : 'Nueva tarea'}
      alCerrar={alCerrar}
      alEnviar={guardar}
      pie={tarea && <button type="button" className={`${botonPeligro} mr-auto`} onClick={borrar}>Borrar</button>}
    >
      <div>
        <label htmlFor="t-titulo" className={etiqueta}>Tarea</label>
        <input id="t-titulo" className={`${campo} w-full`} value={d.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej.: Entregar el laboratorio de Tráfico" autoFocus />
      </div>
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="t-fecha" className={etiqueta}>Fecha límite <span className="font-normal text-texto-suave">(opcional)</span></label>
          <input id="t-fecha" type="date" className={campo} value={d.fechaLimite ?? ''} onChange={(e) => set('fechaLimite', e.target.value || null)} />
        </div>
        <div>
          <label htmlFor="t-prio" className={etiqueta}>Prioridad</label>
          <select id="t-prio" className={`${campo} w-32`} value={d.prioridad} onChange={(e) => set('prioridad', e.target.value as Tarea['prioridad'])}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <div>
          <label htmlFor="t-estado" className={etiqueta}>Estado</label>
          <select id="t-estado" className={`${campo} w-36`} value={d.estado} onChange={(e) => set('estado', e.target.value as Tarea['estado'])}>
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="hecha">Hecha</option>
          </select>
        </div>
      </div>
      <Error texto={error} />
    </Dialogo>
  )
}
