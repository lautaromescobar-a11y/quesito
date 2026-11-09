/** Conversión entre Google Calendar y Quesito. Sin red ni base de datos, para poder probarla. */
import type { Evento, EventoGoogle } from './db'
import { sumarDias } from './rachas'

/** Lo que usa Quesito de un evento de la API de Google Calendar. */
export interface EventoApi {
  id: string
  status?: string
  summary?: string
  htmlLink?: string
  eventType?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

export interface CalendarioApi {
  id: string
  summary: string
  summaryOverride?: string
  backgroundColor?: string
  primary?: boolean
}

/** Máximo de días que se expande un evento largo (vacaciones, cuatrimestre). */
const MAX_DIAS = 62

const dosDig = (n: number) => String(n).padStart(2, '0')
const fechaLocal = (d: Date) => `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}`
const horaLocal = (d: Date) => `${dosDig(d.getHours())}:${dosDig(d.getMinutes())}`

export const nombreCalendario = (c: CalendarioApi) => c.summaryOverride || c.summary || 'Calendario'

/**
 * Convierte un evento de Google en filas de Quesito, una por día.
 * Los eventos de varios días se parten: el primer y el último día con horario, los del medio de todo el día.
 */
export function deGoogle(ev: EventoApi, cal: { id: string; nombre: string; color: string }): EventoGoogle[] {
  if (ev.status === 'cancelled' || ev.eventType === 'workingLocation' || !ev.start || !ev.end) return []
  const base = {
    calendarioId: cal.id,
    calendario: cal.nombre,
    titulo: ev.summary?.trim() || '(Sin título)',
    color: cal.color,
    enlace: ev.htmlLink ?? '',
  }
  const fila = (fecha: string, inicio: string | null, fin: string | null): EventoGoogle => ({
    ...base,
    id: `${cal.id}|${ev.id}|${fecha}`,
    fecha,
    inicio,
    fin,
  })

  // Todo el día: Google da la fecha de fin exclusiva.
  if (ev.start.date) {
    const fin = ev.end.date && ev.end.date > ev.start.date ? ev.end.date : sumarDias(ev.start.date, 1)
    const filas: EventoGoogle[] = []
    for (let f = ev.start.date; f < fin && filas.length < MAX_DIAS; f = sumarDias(f, 1)) filas.push(fila(f, null, null))
    return filas
  }

  if (!ev.start.dateTime || !ev.end.dateTime) return []
  const ini = new Date(ev.start.dateTime)
  const fin = new Date(ev.end.dateTime)
  if (isNaN(ini.getTime()) || isNaN(fin.getTime())) return []
  const fIni = fechaLocal(ini)
  const fFin = fechaLocal(fin)
  const hIni = horaLocal(ini)
  const hFin = horaLocal(fin)

  if (fIni === fFin) return [fila(fIni, hIni, hFin > hIni ? hFin : hIni)]

  const filas = [fila(fIni, hIni, '23:59')]
  for (let f = sumarDias(fIni, 1); f < fFin && filas.length < MAX_DIAS; f = sumarDias(f, 1)) filas.push(fila(f, null, null))
  // Si termina justo a las 00:00, el último día no tiene nada.
  if (hFin > '00:00' && filas.length < MAX_DIAS) filas.push(fila(fFin, '00:00', hFin))
  return filas
}

/** Evento de Google como Evento de Quesito, para mostrarlo en la agenda (no se guarda en la tabla de eventos). */
export function comoEvento(g: EventoGoogle): Evento {
  return {
    id: g.id,
    actualizado: '',
    borrado: false,
    titulo: g.titulo,
    color: g.color,
    fecha: g.fecha,
    inicio: g.inicio,
    fin: g.fin,
    repeticion: 'ninguna',
    categoriaId: null,
    origen: 'google',
  }
}

const REGLA: Record<Evento['repeticion'], string | null> = {
  ninguna: null,
  semanal: 'RRULE:FREQ=WEEKLY',
  mensual: 'RRULE:FREQ=MONTHLY',
  anual: 'RRULE:FREQ=YEARLY',
}

/** Cuerpo para crear o actualizar en Google un evento propio de Quesito. */
export function aGoogle(e: Pick<Evento, 'titulo' | 'fecha' | 'inicio' | 'fin' | 'repeticion'>, zona: string) {
  const regla = REGLA[e.repeticion]
  const conHora = e.inicio && e.fin
  return {
    summary: e.titulo,
    description: 'Creado desde Quesito',
    start: conHora ? { dateTime: `${e.fecha}T${e.inicio}:00`, timeZone: zona } : { date: e.fecha },
    end: conHora ? { dateTime: `${e.fecha}T${e.fin}:00`, timeZone: zona } : { date: sumarDias(e.fecha, 1) },
    recurrence: regla ? [regla] : [],
  }
}

/** ¿Hay que mandar este evento propio a Google? */
export function pendienteDeEnvio(e: Evento): boolean {
  if (e.origen !== 'propio') return false
  if (e.borrado) return !!e.googleId && e.googleEnviado !== e.actualizado
  return e.googleEnviado !== e.actualizado || !e.googleId
}
