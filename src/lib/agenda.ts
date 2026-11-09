/**
 * Lógica de la agenda. Funciones puras para poder probarlas sin base de datos.
 *
 * - Cada fecha usa la plantilla de semana vigente en ese día.
 * - Los cambios puntuales (CambioSemana) modifican solo esa fecha:
 *   "quitar" saca un bloque, "mover" lo edita, "agregar" suma uno nuevo.
 * - Los eventos pueden repetirse semanal, mensual o anualmente.
 */
import type { BloqueRutina, CambioSemana, Evento, PlantillaSemana, Tarea, UsoPlantilla } from './db'
import { COLOR_POR_DEFECTO } from './colores'
import { diaSemana, inicioSemana, sumarDias } from './rachas'

export function aMin(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function deMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/**
 * Qué uso de plantilla aplica a una fecha: primero un uso "solo esta semana";
 * si no hay, el último "desde" que empezó antes o en esa semana.
 */
export function usoDeFecha(usos: UsoPlantilla[], fecha: string): UsoPlantilla | undefined {
  const lunes = inicioSemana(fecha)
  const vivos = usos.filter((u) => !u.borrado)
  const masNuevo = (a: UsoPlantilla, b: UsoPlantilla) => b.actualizado.localeCompare(a.actualizado)
  const deLaSemana = vivos.filter((u) => u.tipo === 'semana' && u.desde === lunes).sort(masNuevo)[0]
  if (deLaSemana) return deLaSemana
  return vivos.filter((u) => u.tipo === 'desde' && u.desde <= lunes).sort((a, b) => b.desde.localeCompare(a.desde) || masNuevo(a, b))[0]
}

export function plantillaDeFecha(plantillas: PlantillaSemana[], usos: UsoPlantilla[], fecha: string): PlantillaSemana | undefined {
  const uso = usoDeFecha(usos, fecha)
  if (!uso?.plantillaId) return undefined
  return plantillas.find((p) => p.id === uso.plantillaId && !p.borrado)
}

export interface ItemAgenda {
  clave: string
  tipo: 'rutina' | 'evento'
  titulo: string
  inicio: string
  fin: string
  color: string
  notas: string
  bloqueId: string | null
  cambioId: string | null
  eventoId: string | null
  /** true si este día tiene un cambio respecto de la plantilla. */
  modificado: boolean
  /** Viene de Google Calendar (solo lectura). */
  google?: boolean
}

type DatosBloque = Pick<BloqueRutina, 'titulo' | 'inicio' | 'fin' | 'color' | 'notas'>

function item(datos: Partial<DatosBloque>, extra: Partial<ItemAgenda> & { clave: string }): ItemAgenda {
  return {
    tipo: 'rutina',
    titulo: datos.titulo ?? '',
    inicio: datos.inicio ?? '00:00',
    fin: datos.fin ?? '00:00',
    color: datos.color || COLOR_POR_DEFECTO,
    notas: datos.notas ?? '',
    bloqueId: null,
    cambioId: null,
    eventoId: null,
    modificado: false,
    ...extra,
  }
}

/** Bloques de la plantilla para un día de la semana (sin fecha concreta). */
export function bloquesDePlantilla(plantillaId: string, bloques: BloqueRutina[], dia: number): ItemAgenda[] {
  return bloques
    .filter((b) => !b.borrado && b.plantillaId === plantillaId && b.dia === dia)
    .map((b) => item(b, { clave: b.id, bloqueId: b.id }))
    .sort((a, b) => aMin(a.inicio) - aMin(b.inicio))
}

/** Bloques de rutina de una fecha, con los cambios puntuales aplicados. */
export function bloquesDelDia(
  plantilla: PlantillaSemana | undefined,
  bloques: BloqueRutina[],
  cambios: CambioSemana[],
  fecha: string,
): ItemAgenda[] {
  const delDia = cambios.filter((c) => !c.borrado && c.fecha === fecha)
  const res: ItemAgenda[] = []

  if (plantilla) {
    for (const b of bloques) {
      if (b.borrado || b.plantillaId !== plantilla.id || b.dia !== diaSemana(fecha)) continue
      const c = delDia.find((x) => x.bloqueId === b.id)
      if (c?.accion === 'quitar') continue
      const datos = c?.accion === 'mover' ? { ...b, ...c.datos } : b
      res.push(item(datos, { clave: `${b.id}@${fecha}`, bloqueId: b.id, cambioId: c?.id ?? null, modificado: !!c }))
    }
  }
  for (const c of delDia) {
    if (c.accion === 'agregar' && c.datos) res.push(item(c.datos, { clave: c.id, cambioId: c.id, modificado: true }))
  }
  return res.sort((a, b) => aMin(a.inicio) - aMin(b.inicio))
}

/** Bloques de la plantilla que el día tiene quitados (para poder restaurarlos). */
export function bloquesQuitados(cambios: CambioSemana[], fecha: string): CambioSemana[] {
  return cambios.filter((c) => !c.borrado && c.fecha === fecha && c.accion === 'quitar')
}

/** Fechas en las que ocurre un evento dentro de [desde, hasta]. */
export function ocurrencias(ev: Evento, desde: string, hasta: string): string[] {
  if (ev.borrado) return []
  if (ev.repeticion === 'ninguna') return ev.fecha >= desde && ev.fecha <= hasta ? [ev.fecha] : []

  const fechas: string[] = []
  if (ev.repeticion === 'semanal') {
    let f = ev.fecha
    if (f < desde) {
      const semanas = Math.floor((Date.parse(desde) - Date.parse(f)) / (7 * 86_400_000))
      f = sumarDias(f, semanas * 7)
    }
    for (; f <= hasta; f = sumarDias(f, 7)) if (f >= desde && f >= ev.fecha) fechas.push(f)
    return fechas
  }

  const [, m0, d0] = ev.fecha.split('-').map(Number)
  let [a, m] = desde.split('-').map(Number)
  const [ah, mh] = hasta.split('-').map(Number)
  while (a < ah || (a === ah && m <= mh)) {
    if (ev.repeticion === 'mensual' || m === m0) {
      if (d0 <= new Date(a, m, 0).getDate()) {
        const f = `${a}-${String(m).padStart(2, '0')}-${String(d0).padStart(2, '0')}`
        if (f >= desde && f <= hasta && f >= ev.fecha) fechas.push(f)
      }
    }
    m++
    if (m > 12) {
      m = 1
      a++
    }
  }
  return fechas.sort()
}

/** Eventos con horario de una fecha, como ítems de agenda. */
export function eventosConHora(eventos: Evento[], fecha: string): ItemAgenda[] {
  return eventos
    .filter((e) => e.inicio && e.fin && ocurrencias(e, fecha, fecha).length > 0)
    .map((e) => item(e as DatosBloque & Evento, { clave: `${e.id}@${fecha}`, tipo: 'evento', eventoId: e.id, notas: '', google: e.origen === 'google' }))
}

export function eventosTodoElDia(eventos: Evento[], fecha: string): Evento[] {
  return eventos.filter((e) => !(e.inicio && e.fin) && ocurrencias(e, fecha, fecha).length > 0)
}

/** Claves de los ítems que se pisan con otro. */
export function solapados(items: Pick<ItemAgenda, 'clave' | 'inicio' | 'fin'>[]): Set<string> {
  const res = new Set<string>()
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (aMin(a.inicio) < aMin(b.fin) && aMin(b.inicio) < aMin(a.fin)) {
        res.add(a.clave)
        res.add(b.clave)
      }
    }
  }
  return res
}

/** Tareas pendientes que vencen hasta `hasta` (incluye vencidas), ordenadas por fecha. */
export function tareasProximas(tareas: Tarea[], hasta: string): Tarea[] {
  return tareas
    .filter((t) => !t.borrado && t.estado !== 'hecha' && t.fechaLimite && t.fechaLimite <= hasta)
    .sort((a, b) => (a.fechaLimite ?? '').localeCompare(b.fechaLimite ?? ''))
}

export interface Actividad {
  titulo: string
  color: string
  /** Duración más usada, en minutos. */
  minutos: number
  veces: number
}

function masFrecuente<T>(valores: T[]): T {
  const cuenta = new Map<T, number>()
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1)
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Actividades que ya usaste en algún bloque (de cualquier plantilla o agregado un solo día),
 * con su color y duración más habituales. Ordenadas por cuántas veces aparecen.
 */
export function actividadesGuardadas(bloques: BloqueRutina[], cambios: CambioSemana[] = []): Actividad[] {
  const fuentes: Partial<BloqueRutina>[] = [
    ...bloques.filter((b) => !b.borrado),
    ...cambios.filter((c) => !c.borrado && c.accion === 'agregar' && c.datos).map((c) => c.datos!),
  ]
  const grupos = new Map<string, Partial<BloqueRutina>[]>()
  for (const b of fuentes) {
    const titulo = b.titulo?.trim()
    if (!titulo || !b.inicio || !b.fin) continue
    const clave = titulo.toLocaleLowerCase('es')
    grupos.set(clave, [...(grupos.get(clave) ?? []), b])
  }
  return [...grupos.values()]
    .map((g) => ({
      titulo: masFrecuente(g.map((b) => b.titulo!.trim())),
      color: masFrecuente(g.map((b) => b.color || COLOR_POR_DEFECTO)),
      minutos: masFrecuente(g.map((b) => aMin(b.fin!) - aMin(b.inicio!))),
      veces: g.length,
    }))
    .sort((a, b) => b.veces - a.veces || a.titulo.localeCompare(b.titulo, 'es'))
}
