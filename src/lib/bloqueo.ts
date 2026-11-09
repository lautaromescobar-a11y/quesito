import { useSyncExternalStore } from 'react'

/**
 * Estado de desbloqueo del diario, solo en memoria: al cerrar o recargar la app vuelve a pedir el PIN.
 * Después de salir del diario queda abierto 5 minutos, para no pedirlo a cada rato.
 */
const GRACIA_MS = 5 * 60_000
let desbloqueadoHasta = 0
let fallos = 0
let ultimoFallo = 0
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

export const bloqueo = {
  estaDesbloqueado: () => desbloqueadoHasta > Date.now(),
  desbloquear() {
    desbloqueadoHasta = Number.MAX_SAFE_INTEGER
    fallos = 0
    avisar()
  },
  /** Al salir del diario: sigue abierto 5 minutos más. */
  salir() {
    if (desbloqueadoHasta > Date.now()) desbloqueadoHasta = Date.now() + GRACIA_MS
  },
  bloquear() {
    desbloqueadoHasta = 0
    avisar()
  },
  registrarFallo() {
    fallos++
    ultimoFallo = Date.now()
    avisar()
  },
  fallos: () => fallos,
  ultimoFallo: () => ultimoFallo,
  suscribir(f: () => void) {
    oyentes.add(f)
    return () => oyentes.delete(f)
  },
}

export function useDesbloqueado(): boolean {
  return useSyncExternalStore(bloqueo.suscribir, bloqueo.estaDesbloqueado)
}
