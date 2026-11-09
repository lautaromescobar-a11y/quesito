/**
 * Cálculo de rachas. Funciones puras (sin base de datos) para poder probarlas.
 *
 * Reglas:
 * - "diaria" y "dias": la racha cuenta los días cumplidos seguidos. Un día
 *   programado sin cumplir gasta un día de gracia; si se fallan más días
 *   seguidos que los días de gracia, la racha vuelve a 0.
 * - "semanal" (N veces por semana): la racha cuenta semanas seguidas en las
 *   que se llegó a N. La semana en curso no la corta. No usa días de gracia.
 * - Hoy sin marcar nunca corta la racha: todavía hay tiempo.
 * - Cumplir solo la versión mínima cuenta como cumplido.
 */
import type { DiaSemana } from './db'

export interface ConfigHabito {
  frecuencia: 'diaria' | 'dias' | 'semanal'
  dias: DiaSemana[]
  vecesPorSemana: number
  diasGracia: number
}

export interface ResultadoRacha {
  actual: number
  mejor: number
  unidad: 'días' | 'semanas'
  /** Días de gracia que ya se gastaron en la racha actual (solo por días). */
  graciaUsada: number
  /** Para "semanal": veces cumplidas esta semana. */
  semanaActual: number
}

const MS_DIA = 86_400_000

function aFecha(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

function aISO(d: Date): string {
  const a = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${a}-${m}-${dd}`
}

export function sumarDias(iso: string, n: number): string {
  const d = aFecha(iso)
  d.setDate(d.getDate() + n)
  return aISO(d)
}

export function diaSemana(iso: string): DiaSemana {
  return aFecha(iso).getDay() as DiaSemana
}

/** Lunes de la semana de esa fecha. */
export function inicioSemana(iso: string): string {
  const desdeLunes = (diaSemana(iso) + 6) % 7
  return sumarDias(iso, -desdeLunes)
}

export function tocaEseDia(h: ConfigHabito, iso: string): boolean {
  if (h.frecuencia === 'dias') return h.dias.includes(diaSemana(iso))
  return true
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / MS_DIA)
}

export function calcularRacha(h: ConfigHabito, cumplidos: Set<string>, hoy: string): ResultadoRacha {
  const fechas = [...cumplidos].filter((f) => f <= hoy).sort()
  const semanaHoy = inicioSemana(hoy)
  const semanaActual = [...cumplidos].filter((f) => f >= semanaHoy && f <= hoy).length

  if (fechas.length === 0) {
    return { actual: 0, mejor: 0, unidad: h.frecuencia === 'semanal' ? 'semanas' : 'días', graciaUsada: 0, semanaActual }
  }

  if (h.frecuencia === 'semanal') {
    const meta = Math.max(1, h.vecesPorSemana)
    let actual = 0
    let mejor = 0
    for (let semana = inicioSemana(fechas[0]); semana <= semanaHoy; semana = sumarDias(semana, 7)) {
      const fin = sumarDias(semana, 6)
      const hechas = fechas.filter((f) => f >= semana && f <= fin).length
      if (hechas >= meta) actual++
      else if (semana !== semanaHoy) actual = 0
      mejor = Math.max(mejor, actual)
    }
    return { actual, mejor, unidad: 'semanas', graciaUsada: 0, semanaActual }
  }

  let actual = 0
  let mejor = 0
  let fallas = 0
  const total = diasEntre(fechas[0], hoy)
  for (let i = 0; i <= total; i++) {
    const dia = sumarDias(fechas[0], i)
    if (!tocaEseDia(h, dia)) continue
    if (cumplidos.has(dia)) {
      actual++
      fallas = 0
    } else if (dia !== hoy) {
      fallas++
      if (fallas > h.diasGracia) actual = 0
    }
    mejor = Math.max(mejor, actual)
  }
  return { actual, mejor, unidad: 'días', graciaUsada: actual > 0 ? fallas : 0, semanaActual }
}

/** Texto corto de la frecuencia: "Todos los días", "Lun, Mié y Vie", "3 veces por semana". */
export function textoFrecuencia(h: ConfigHabito): string {
  if (h.frecuencia === 'diaria') return 'Todos los días'
  if (h.frecuencia === 'semanal') return `${h.vecesPorSemana} ${h.vecesPorSemana === 1 ? 'vez' : 'veces'} por semana`
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const orden = [...h.dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => nombres[d])
  if (orden.length === 0) return 'Sin días elegidos'
  if (orden.length === 1) return orden[0]
  return orden.slice(0, -1).join(', ') + ' y ' + orden[orden.length - 1]
}
