import { useSyncExternalStore } from 'react'

/** Avisos breves que aparecen abajo a la derecha y se van solos. */
export interface Aviso {
  id: number
  texto: string
  detalle?: string
}

let avisos: Aviso[] = []
let siguiente = 1
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

export function mostrarAviso(texto: string, detalle?: string, duracionMs = 6000) {
  const id = siguiente++
  avisos = [...avisos.slice(-2), { id, texto, detalle }]
  avisar()
  window.setTimeout(() => cerrarAviso(id), duracionMs)
}

export function cerrarAviso(id: number) {
  avisos = avisos.filter((a) => a.id !== id)
  avisar()
}

export function useAvisos(): Aviso[] {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => avisos,
  )
}
