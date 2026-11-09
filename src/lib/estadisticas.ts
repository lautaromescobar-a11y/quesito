/** Estadísticas y resumen semanal: funciones puras para poder probarlas. */
import type { CheckinAnimo, EntradaDiario, Habito, RegistroHabito, SesionFoco, Tarea } from './db'
import { inicioSemana, sumarDias, tocaEseDia } from './rachas'

const vigente = (r: RegistroHabito) => !r.borrado && r.estado !== 'omitido'

export interface Cumplimiento {
  /** Veces que se cumplió (completo o mínimo). */
  hechos: number
  /** Veces que tocaba (días programados o meta semanal). */
  esperados: number
  /** 0 a 100, o null si no tocaba nunca en el período. */
  porcentaje: number | null
}

/**
 * Cumplimiento de un hábito entre dos fechas (incluidas).
 * Solo cuenta desde el primer registro del hábito, para no castigar los días antes de crearlo.
 * - diaria / días: días programados cumplidos sobre días programados.
 * - semanal: veces hechas (topeadas a la meta) sobre la meta de cada semana.
 */
export function cumplimiento(h: Habito, registros: RegistroHabito[], desde: string, hasta: string): Cumplimiento {
  const propios = registros.filter((r) => r.habitoId === h.id && vigente(r))
  const fechas = new Set(propios.map((r) => r.fecha))
  const primero = propios.map((r) => r.fecha).sort()[0]
  if (!primero) return { hechos: 0, esperados: 0, porcentaje: null }
  const inicio = primero > desde ? primero : desde
  if (inicio > hasta) return { hechos: 0, esperados: 0, porcentaje: null }

  let hechos = 0
  let esperados = 0
  if (h.frecuencia === 'semanal') {
    const meta = Math.max(1, h.vecesPorSemana)
    for (let lunes = inicioSemana(inicio); lunes <= hasta; lunes = sumarDias(lunes, 7)) {
      const fin = sumarDias(lunes, 6)
      const enSemana = [...fechas].filter((f) => f >= lunes && f <= fin && f >= inicio && f <= hasta).length
      hechos += Math.min(meta, enSemana)
      esperados += meta
    }
  } else {
    for (let d = inicio; d <= hasta; d = sumarDias(d, 1)) {
      if (!tocaEseDia(h, d)) continue
      esperados++
      if (fechas.has(d)) hechos++
    }
  }
  return { hechos, esperados, porcentaje: esperados ? Math.round((hechos / esperados) * 100) : null }
}

/** Cumplimiento conjunto de todos los hábitos. */
export function cumplimientoTotal(habitos: Habito[], registros: RegistroHabito[], desde: string, hasta: string): Cumplimiento {
  let hechos = 0
  let esperados = 0
  for (const h of habitos) {
    const c = cumplimiento(h, registros, desde, hasta)
    hechos += c.hechos
    esperados += c.esperados
  }
  return { hechos, esperados, porcentaje: esperados ? Math.round((hechos / esperados) * 100) : null }
}

export interface DatosResumen {
  habitos: Habito[]
  registros: RegistroHabito[]
  animo: CheckinAnimo[]
  foco: SesionFoco[]
  tareas: Tarea[]
  diario: EntradaDiario[]
}

export interface ResumenSemana {
  lunes: string
  domingo: string
  habitos: { nombre: string; cumplimiento: Cumplimiento }[]
  total: Cumplimiento
  animo: number | null
  energia: number | null
  diasAnimo: number
  minutosFoco: number
  sesionesFoco: number
  tareasHechas: number
  entradasDiario: number
}

const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

/**
 * Resumen de la semana (lunes a domingo) que contiene `fecha`.
 * Con `hoy`, los hábitos se cuentan solo hasta hoy: los días que todavía no llegaron no son fallas.
 */
export function resumenSemana(d: DatosResumen, fecha: string, hoy?: string): ResumenSemana {
  const lunes = inicioSemana(fecha)
  const domingo = sumarDias(lunes, 6)
  const corte = hoy && hoy < domingo ? hoy : domingo
  const enSemana = (f: string) => f >= lunes && f <= domingo
  const activos = d.habitos.filter((h) => !h.borrado)
  const animo = d.animo.filter((c) => !c.borrado && enSemana(c.fecha))
  const foco = d.foco.filter((s) => !s.borrado && enSemana(s.fecha))
  return {
    lunes,
    domingo,
    habitos: activos.map((h) => ({ nombre: h.nombre, cumplimiento: cumplimiento(h, d.registros, lunes, corte) })),
    total: cumplimientoTotal(activos, d.registros, lunes, corte),
    animo: promedio(animo.map((c) => c.animo)),
    energia: promedio(animo.map((c) => c.energia)),
    diasAnimo: animo.length,
    minutosFoco: foco.reduce((n, s) => n + s.minutos, 0),
    sesionesFoco: foco.length,
    // Tareas marcadas como hechas durante la semana (fecha de la última modificación).
    tareasHechas: d.tareas.filter((t) => !t.borrado && t.estado === 'hecha' && enSemana(t.actualizado.slice(0, 10))).length,
    entradasDiario: d.diario.filter((e) => !e.borrado && enSemana(e.fecha)).length,
  }
}

/** Lunes de las últimas `n` semanas, de la más vieja a la actual. */
export function ultimasSemanas(hoy: string, n: number): string[] {
  const actual = inicioSemana(hoy)
  return Array.from({ length: n }, (_, i) => sumarDias(actual, -7 * (n - 1 - i)))
}

export interface Patron {
  conTodos: number | null
  sinTodos: number | null
  dias: number
}

/**
 * Ánimo promedio en los días que cumpliste todos los hábitos que tocaban,
 * comparado con los días que no. Solo días con check-in de ánimo.
 */
export function animoSegunHabitos(habitos: Habito[], registros: RegistroHabito[], animo: CheckinAnimo[], desde: string, hasta: string): Patron {
  const activos = habitos.filter((h) => !h.borrado && h.activo && h.frecuencia !== 'semanal')
  const hechos = new Set(registros.filter(vigente).map((r) => `${r.habitoId}|${r.fecha}`))
  const con: number[] = []
  const sin: number[] = []
  for (const c of animo) {
    if (c.borrado || c.fecha < desde || c.fecha > hasta) continue
    const tocan = activos.filter((h) => tocaEseDia(h, c.fecha))
    if (!tocan.length) continue
    if (tocan.every((h) => hechos.has(`${h.id}|${c.fecha}`))) con.push(c.animo)
    else sin.push(c.animo)
  }
  return { conTodos: promedio(con), sinTodos: promedio(sin), dias: con.length + sin.length }
}

// ---------- Respaldo ----------

export const FORMATO_RESPALDO = 'quesito-respaldo'
export const VERSION_RESPALDO = 1

export interface Respaldo {
  formato: typeof FORMATO_RESPALDO
  version: number
  creado: string
  tablas: Record<string, unknown[]>
}

/** Revisa que un archivo sea un respaldo válido. Devuelve el error en palabras o null. */
export function validarRespaldo(datos: unknown, tablasConocidas: string[]): string | null {
  if (!datos || typeof datos !== 'object') return 'El archivo no es un respaldo de Quesito.'
  const r = datos as Partial<Respaldo>
  if (r.formato !== FORMATO_RESPALDO) return 'El archivo no es un respaldo de Quesito.'
  if (typeof r.version !== 'number' || r.version > VERSION_RESPALDO) return 'El respaldo es de una versión más nueva de la app. Actualizá Quesito y probá de nuevo.'
  if (!r.tablas || typeof r.tablas !== 'object') return 'El respaldo está incompleto.'
  for (const [nombre, filas] of Object.entries(r.tablas)) {
    if (!tablasConocidas.includes(nombre)) return `El respaldo tiene datos desconocidos ("${nombre}").`
    if (!Array.isArray(filas)) return `El respaldo está dañado ("${nombre}").`
  }
  return null
}

/** Cuántos elementos útiles trae un respaldo, para mostrar antes de importar. */
export function contarRespaldo(r: Respaldo): Record<string, number> {
  const vivos = (t: string) => (r.tablas[t] ?? []).filter((x) => !(x as { borrado?: boolean }).borrado).length
  return { habitos: vivos('habitos'), plantillas: vivos('plantillas'), tareas: vivos('tareas'), diario: vivos('diario'), animo: vivos('animo') }
}
