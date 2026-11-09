import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BloqueRutina, type CambioSemana, type Evento, type PlantillaSemana, type Tarea, type UsoPlantilla } from './db'
import { comoEvento } from './googleLogica'
import { bloquesDelDia, eventosConHora, eventosTodoElDia, plantillaDeFecha, usoDeFecha, type ItemAgenda } from './agenda'

export interface DatosAgenda {
  plantillas: PlantillaSemana[]
  usos: UsoPlantilla[]
  bloques: BloqueRutina[]
  cambios: CambioSemana[]
  eventos: Evento[]
  tareas: Tarea[]
}

/** Todo lo que necesita la agenda, actualizado en vivo. Son pocos datos, así que se cargan completos. */
export function useDatosAgenda(): DatosAgenda | undefined {
  return useLiveQuery(async () => ({
    plantillas: await db.plantillas.filter((p) => !p.borrado).toArray(),
    usos: await db.usosPlantilla.filter((u) => !u.borrado).toArray(),
    bloques: await db.bloques.filter((b) => !b.borrado).toArray(),
    cambios: await db.cambiosSemana.filter((c) => !c.borrado).toArray(),
    // Los eventos de Google se suman como eventos de solo lectura.
    eventos: [...(await db.eventos.filter((e) => !e.borrado).toArray()), ...(await db.eventosGoogle.toArray()).map(comoEvento)],
    tareas: await db.tareas.filter((t) => !t.borrado).toArray(),
  }))
}

export interface DiaAgenda {
  fecha: string
  plantilla: PlantillaSemana | undefined
  /** Cómo se eligió la plantilla de este día. */
  uso: UsoPlantilla | undefined
  /** Rutina + eventos con horario, ordenados. */
  items: ItemAgenda[]
  todoElDia: Evento[]
  tareas: Tarea[]
}

export function agendaDelDia(d: DatosAgenda, fecha: string): DiaAgenda {
  const uso = usoDeFecha(d.usos, fecha)
  const plantilla = plantillaDeFecha(d.plantillas, d.usos, fecha)
  const items = [...bloquesDelDia(plantilla, d.bloques, d.cambios, fecha), ...eventosConHora(d.eventos, fecha)].sort((a, b) =>
    a.inicio.localeCompare(b.inicio),
  )
  return {
    fecha,
    plantilla,
    uso,
    items,
    todoElDia: eventosTodoElDia(d.eventos, fecha),
    tareas: d.tareas.filter((t) => t.fechaLimite === fecha && t.estado !== 'hecha'),
  }
}
