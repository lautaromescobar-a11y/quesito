import { useLiveQuery } from 'dexie-react-hooks'
import { leerAjuste } from './db'

/** Nombre de la persona que usa la app (vacío si no lo cargó). */
export function useNombre(): string | undefined {
  return useLiveQuery(() => leerAjuste('nombre', ''))
}
