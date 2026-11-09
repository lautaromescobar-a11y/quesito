/** Guarda el aviso del navegador para instalar la app, que llega una sola vez al cargar. */
import { useSyncExternalStore } from 'react'

interface AvisoInstalar extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let aviso: AvisoInstalar | null = null
let instalada = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    aviso = e as AvisoInstalar
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    aviso = null
    instalada = true
    avisar()
  })
}

export type EstadoInstalar = 'instalada' | 'disponible' | 'manual'
const estado = (): EstadoInstalar => (instalada ? 'instalada' : aviso ? 'disponible' : 'manual')

export function useInstalar(): EstadoInstalar {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    estado,
  )
}

export async function instalar(): Promise<boolean> {
  if (!aviso) return false
  await aviso.prompt()
  const { outcome } = await aviso.userChoice
  aviso = null
  avisar()
  return outcome === 'accepted'
}

export const esIPhone = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
