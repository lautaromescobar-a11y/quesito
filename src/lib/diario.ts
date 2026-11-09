/**
 * Diario y ánimo: funciones puras (sin base de datos) para poder probarlas.
 */
import type { CheckinAnimo, EntradaDiario } from './db'
import { sumarDias } from './rachas'

export const ETIQUETAS_ANIMO = ['Muy bajo', 'Bajo', 'Normal', 'Bien', 'Muy bien'] as const
export const ETIQUETAS_ENERGIA = ['Agotado', 'Baja', 'Normal', 'Buena', 'A full'] as const

/** Preguntas guía para escribir. Se insertan como encabezados en el texto. */
export const PREGUNTAS = [
  { corto: 'Agradezco', texto: 'Hoy agradezco:' },
  { corto: 'Lo mejor', texto: 'Lo mejor del día:' },
  { corto: 'Aprendí', texto: 'Hoy aprendí:' },
  { corto: 'Me costó', texto: 'Lo que me costó:' },
  { corto: 'Mañana', texto: 'Mañana quiero:' },
] as const

/** Agrega una pregunta al final del texto, separada por una línea en blanco. */
export function agregarPregunta(texto: string, pregunta: string): string {
  const base = texto.replace(/\s+$/, '')
  return base ? `${base}\n\n${pregunta} ` : `${pregunta} `
}

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Entradas que contienen todas las palabras buscadas (sin importar tildes ni mayúsculas) y la etiqueta, si se eligió. */
export function buscarEntradas(entradas: EntradaDiario[], texto: string, etiqueta?: string): EntradaDiario[] {
  const palabras = sinTildes(texto).split(/\s+/).filter(Boolean)
  return entradas
    .filter((e) => !e.borrado)
    .filter((e) => !etiqueta || e.etiquetas.includes(etiqueta))
    .filter((e) => {
      const todo = sinTildes(`${e.titulo} ${e.texto} ${e.etiquetas.join(' ')}`)
      return palabras.every((p) => todo.includes(p))
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** Todas las etiquetas usadas, ordenadas por cantidad de usos. */
export function etiquetasUsadas(entradas: EntradaDiario[]): { etiqueta: string; veces: number }[] {
  const cuenta = new Map<string, number>()
  for (const e of entradas) if (!e.borrado) for (const t of e.etiquetas) cuenta.set(t, (cuenta.get(t) ?? 0) + 1)
  return [...cuenta.entries()].map(([etiqueta, veces]) => ({ etiqueta, veces })).sort((a, b) => b.veces - a.veces || a.etiqueta.localeCompare(b.etiqueta))
}

/** Normaliza una etiqueta: minúsculas, sin "#" ni espacios de más. */
export function limpiarEtiqueta(t: string): string {
  return t.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLocaleLowerCase('es')
}

function restarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const total = a * 12 + (m - 1) - meses
  const anio = Math.floor(total / 12)
  const mes = (total % 12) + 1
  const ultimo = new Date(anio, mes, 0).getDate()
  return `${anio}-${String(mes).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`
}

/** Entradas escritas hace una semana, un mes y un año respecto de `fecha`. */
export function recuerdos(entradas: EntradaDiario[], fecha: string): { cuando: string; entrada: EntradaDiario }[] {
  const objetivos = [
    { cuando: 'Hace una semana', fecha: sumarDias(fecha, -7) },
    { cuando: 'Hace un mes', fecha: restarMeses(fecha, 1) },
    { cuando: 'Hace un año', fecha: restarMeses(fecha, 12) },
  ]
  const res: { cuando: string; entrada: EntradaDiario }[] = []
  for (const o of objetivos) {
    const e = entradas.find((x) => !x.borrado && x.fecha === o.fecha && (x.texto.trim() || x.titulo.trim()))
    if (e) res.push({ cuando: o.cuando, entrada: e })
  }
  return res
}

/** Primera línea con contenido, para mostrar en la lista. */
export function resumen(e: Pick<EntradaDiario, 'titulo' | 'texto'>, largo = 90): string {
  if (e.titulo.trim()) return e.titulo.trim()
  const linea = e.texto.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  return linea.length > largo ? linea.slice(0, largo - 1) + '…' : linea
}

export interface ResumenAnimo {
  dias: number
  animo: number | null
  energia: number | null
}

/** Promedio de ánimo y energía en los `n` días que terminan en `hasta` (incluido). */
export function promedio(checkins: CheckinAnimo[], hasta: string, n: number): ResumenAnimo {
  const desde = sumarDias(hasta, -(n - 1))
  const enRango = checkins.filter((c) => !c.borrado && c.fecha >= desde && c.fecha <= hasta)
  if (!enRango.length) return { dias: 0, animo: null, energia: null }
  const prom = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10
  return { dias: enRango.length, animo: prom(enRango.map((c) => c.animo)), energia: prom(enRango.map((c) => c.energia)) }
}

// ---------- PIN ----------

export async function hashPin(pin: string, sal: string): Promise<string> {
  const datos = new TextEncoder().encode(`${sal}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

/** Después de 5 intentos fallidos seguidos hay que esperar 30 segundos. */
export const MAX_INTENTOS = 5
export const ESPERA_MS = 30_000

export function esperaRestante(fallos: number, ultimoFallo: number, ahora: number): number {
  if (fallos < MAX_INTENTOS) return 0
  return Math.max(0, ultimoFallo + ESPERA_MS - ahora)
}
