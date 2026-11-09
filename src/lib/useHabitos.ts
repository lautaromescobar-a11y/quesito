import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Habito, type RegistroHabito } from './db'
import { hoyISO } from './fechas'
import { calcularRacha, type ResultadoRacha } from './rachas'

export interface HabitoConDatos {
  habito: Habito
  /** fecha → estado, solo registros vigentes (no borrados ni omitidos). */
  estados: Map<string, RegistroHabito['estado']>
  racha: ResultadoRacha
}

/** Hábitos (activos o todos) con sus registros y rachas, actualizados en vivo. */
export function useHabitos(incluirArchivados = false): HabitoConDatos[] | undefined {
  return useLiveQuery(async () => {
    const hoy = hoyISO()
    const habitos = await db.habitos
      .orderBy('orden')
      .filter((h) => !h.borrado && (incluirArchivados || h.activo))
      .toArray()
    const registros = await db.registrosHabito.filter((r) => !r.borrado && r.estado !== 'omitido').toArray()
    return habitos.map((habito) => {
      const estados = new Map<string, RegistroHabito['estado']>()
      for (const r of registros) if (r.habitoId === habito.id) estados.set(r.fecha, r.estado)
      return { habito, estados, racha: calcularRacha(habito, new Set(estados.keys()), hoy) }
    })
  }, [incluirArchivados])
}
