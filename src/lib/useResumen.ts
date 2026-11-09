import { useLiveQuery } from 'dexie-react-hooks'
import { db, nuevo, type RevisionSemanal, type Sincronizable, type Tarea } from './db'
import type { DatosResumen } from './estadisticas'
import { sumarDias } from './rachas'

/** Todos los datos que usan la revisión y las estadísticas, en vivo. */
export function useDatosResumen(): DatosResumen | undefined {
  return useLiveQuery(async () => ({
    habitos: await db.habitos.filter((h) => !h.borrado).sortBy('orden'),
    registros: await db.registrosHabito.filter((r) => !r.borrado).toArray(),
    animo: await db.animo.filter((c) => !c.borrado).toArray(),
    foco: await db.foco.filter((s) => !s.borrado).toArray(),
    tareas: await db.tareas.filter((t) => !t.borrado).toArray(),
    diario: await db.diario.filter((e) => !e.borrado).toArray(),
  }))
}

export function useRevisiones(): RevisionSemanal[] | undefined {
  return useLiveQuery(async () => (await db.revisiones.filter((r) => !r.borrado).toArray()).sort((a, b) => b.semana.localeCompare(a.semana)))
}

/** Guarda la revisión de una semana. Con `crearTareas`, las prioridades nuevas pasan a Tareas para la semana siguiente. */
export async function guardarRevision(semana: string, respuestas: Record<string, string>, prioridades: string[], crearTareas: boolean) {
  const limpias = prioridades.map((p) => p.trim()).filter(Boolean)
  const existente = await db.revisiones.where('semana').equals(semana).filter((r) => !r.borrado).first()
  const anteriores = existente?.prioridades ?? []
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.revisiones, db.tareas, async () => {
    if (existente) await db.revisiones.update(existente.id, { respuestas, prioridades: limpias, actualizado: ahora })
    else await db.revisiones.add(nuevo<Omit<RevisionSemanal, keyof Sincronizable>>({ semana, respuestas, prioridades: limpias }))
    if (crearTareas) {
      const domingoSiguiente = sumarDias(semana, 13)
      const nuevas = limpias.filter((p) => !anteriores.includes(p))
      await db.tareas.bulkAdd(nuevas.map((titulo) => nuevo<Omit<Tarea, keyof Sincronizable>>({ titulo, fechaLimite: domingoSiguiente, prioridad: 'alta', estado: 'pendiente', categoriaId: null })))
    }
  })
}
