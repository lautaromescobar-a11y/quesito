import { useLiveQuery } from 'dexie-react-hooks'
import { guardarAjuste, leerAjuste } from './db'
import type { TipoSonido } from './sonidos'

// ---------- Sonido del foco ----------

export interface PrefSonido {
  tipo: TipoSonido
  volumen: number // 0 a 1
  enPausas: boolean
}

export const SONIDO_INICIAL: PrefSonido = { tipo: 'silencio', volumen: 0.5, enPausas: false }

export interface Musica {
  id: string
  nombre: string
  blob: Blob
}

export function usePrefSonido(): PrefSonido | undefined {
  return useLiveQuery(async () => ({ ...SONIDO_INICIAL, ...(await leerAjuste<Partial<PrefSonido>>('sonidoFoco', {})) }))
}

export async function guardarPrefSonido(p: PrefSonido) {
  await guardarAjuste('sonidoFoco', p)
}

export function useMusica(): Musica[] | undefined {
  return useLiveQuery(() => leerAjuste<Musica[]>('musicaFoco', []))
}

export async function agregarMusica(archivos: File[]) {
  const actual = await leerAjuste<Musica[]>('musicaFoco', [])
  const nuevos = archivos.map((f) => ({ id: crypto.randomUUID(), nombre: f.name.replace(/\.[^.]+$/, ''), blob: f as Blob }))
  await guardarAjuste('musicaFoco', [...actual, ...nuevos])
}

export async function quitarMusica(id: string) {
  const actual = await leerAjuste<Musica[]>('musicaFoco', [])
  await guardarAjuste('musicaFoco', actual.filter((m) => m.id !== id))
}
