/** Lógica pura del temporizador de foco (Pomodoro), separada para poder probarla. */

export type Fase = 'foco' | 'pausa' | 'pausaLarga'
export type EstadoReloj = 'detenido' | 'corriendo' | 'pausado'

export interface ConfigFoco {
  foco: number // minutos
  pausa: number
  pausaLarga: number
  cadaCuantos: number // focos antes de una pausa larga
  autoSiguiente: boolean
}

export const CONFIG_INICIAL: ConfigFoco = { foco: 25, pausa: 5, pausaLarga: 15, cadaCuantos: 4, autoSiguiente: false }

export const NOMBRE_FASE: Record<Fase, string> = { foco: 'Foco', pausa: 'Pausa corta', pausaLarga: 'Pausa larga' }

export interface Vinculo {
  tipo: 'libre' | 'bloque' | 'tarea'
  id: string | null
  titulo: string
}

export interface EstadoFoco {
  fase: Fase
  estado: EstadoReloj
  /** Momento (ms) en que termina la fase, si está corriendo. */
  finEn: number | null
  /** Lo que falta (ms) cuando está detenido o pausado. */
  restanteMs: number
  /** Focos completados en la serie actual. */
  ciclo: number
  vinculo: Vinculo
}

export function duracionMs(fase: Fase, c: ConfigFoco): number {
  return (fase === 'foco' ? c.foco : fase === 'pausa' ? c.pausa : c.pausaLarga) * 60_000
}

export function estadoInicial(c: ConfigFoco): EstadoFoco {
  return { fase: 'foco', estado: 'detenido', finEn: null, restanteMs: duracionMs('foco', c), ciclo: 0, vinculo: { tipo: 'libre', id: null, titulo: '' } }
}

/** Después de un foco viene pausa (o pausa larga cada N focos); después de una pausa, foco. */
export function siguienteFase(fase: Fase, cicloTrasTerminar: number, c: ConfigFoco): Fase {
  if (fase !== 'foco') return 'foco'
  return cicloTrasTerminar > 0 && cicloTrasTerminar % Math.max(1, c.cadaCuantos) === 0 ? 'pausaLarga' : 'pausa'
}

export function restante(e: EstadoFoco, ahora: number): number {
  return e.estado === 'corriendo' && e.finEn ? Math.max(0, e.finEn - ahora) : e.restanteMs
}

export function iniciar(e: EstadoFoco, ahora: number): EstadoFoco {
  if (e.estado === 'corriendo') return e
  return { ...e, estado: 'corriendo', finEn: ahora + e.restanteMs }
}

export function pausar(e: EstadoFoco, ahora: number): EstadoFoco {
  if (e.estado !== 'corriendo') return e
  return { ...e, estado: 'pausado', restanteMs: restante(e, ahora), finEn: null }
}

export function reiniciar(e: EstadoFoco, c: ConfigFoco): EstadoFoco {
  return { ...e, estado: 'detenido', finEn: null, restanteMs: duracionMs(e.fase, c) }
}

export function elegirFase(e: EstadoFoco, fase: Fase, c: ConfigFoco): EstadoFoco {
  return { ...e, fase, estado: 'detenido', finEn: null, restanteMs: duracionMs(fase, c) }
}

/**
 * Termina la fase actual (porque se cumplió el tiempo o porque se saltó) y prepara la siguiente.
 * Devuelve también si fue un foco completo, para registrar la sesión.
 */
export function terminarFase(e: EstadoFoco, c: ConfigFoco, ahora: number, saltada = false): { estado: EstadoFoco; focoCompleto: boolean } {
  const focoCompleto = e.fase === 'foco' && !saltada
  const ciclo = e.fase === 'foco' && !saltada ? e.ciclo + 1 : e.ciclo
  // Un foco salteado no cuenta para la pausa larga.
  const fase = e.fase === 'foco' && saltada ? 'pausa' : siguienteFase(e.fase, ciclo, c)
  const cicloSerie = e.fase === 'pausaLarga' ? 0 : ciclo
  const base: EstadoFoco = { ...e, fase, ciclo: cicloSerie, restanteMs: duracionMs(fase, c), finEn: null, estado: 'detenido' }
  return { estado: c.autoSiguiente && !saltada ? iniciar(base, ahora) : base, focoCompleto }
}

export function formatoReloj(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
