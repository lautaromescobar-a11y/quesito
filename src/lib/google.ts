/**
 * Conexión con Google Calendar.
 * - Lee los calendarios que elijas (solo lectura) y guarda una copia local.
 * - Envía tus eventos de Quesito a un calendario propio llamado "Quesito".
 * El permiso de Google dura 1 hora; después hay que tocar "Actualizar" (Google no deja renovarlo solo sin servidor).
 */
import { useSyncExternalStore } from 'react'
import { db, guardarAjuste, leerAjuste, type Evento, type EventoGoogle } from './db'
import { aGoogle, deGoogle, nombreCalendario, pendienteDeEnvio, type CalendarioApi, type EventoApi } from './googleLogica'
import { hoyISO } from './fechas'
import { sumarDias } from './rachas'
import { NOMBRE_APP } from './app'

export const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

const PERMISOS = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
]
const API = 'https://www.googleapis.com/calendar/v3'
const CLAVE_TOKEN = 'quesito.google.token'
/** Rango que se trae: 2 meses para atrás y 1 año para adelante. */
const DIAS_ATRAS = 60
const DIAS_ADELANTE = 365

export interface CalendarioElegible {
  id: string
  nombre: string
  color: string
  elegido: boolean
}

export interface AjustesGoogle {
  conectado: boolean
  calendarios: CalendarioElegible[]
  /** Enviar mis eventos de Quesito a Google. */
  enviar: boolean
  quesitoCalId?: string
  ultimaSinc?: string
}

export const AJUSTES_GOOGLE_INICIALES: AjustesGoogle = { conectado: false, calendarios: [], enviar: true }

export const leerAjustesGoogle = () => leerAjuste<AjustesGoogle>('google', AJUSTES_GOOGLE_INICIALES)
const guardarAjustesGoogle = (a: AjustesGoogle) => guardarAjuste('google', a)

// ---------- Estado visible (para la pantalla) ----------

export type FaseGoogle = 'inactivo' | 'sincronizando' | 'reconectar' | 'error'
export interface EstadoGoogle {
  fase: FaseGoogle
  mensaje: string
}

let estado: EstadoGoogle = { fase: 'inactivo', mensaje: '' }
const oyentes = new Set<() => void>()
function setEstado(e: EstadoGoogle) {
  estado = e
  oyentes.forEach((f) => f())
}
export function useEstadoGoogle(): EstadoGoogle {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => estado,
  )
}

// ---------- Permiso (token) ----------

export class NecesitaReconectar extends Error {}

interface Token {
  token: string
  vence: number
}

function tokenGuardado(): Token | null {
  try {
    const t = JSON.parse(localStorage.getItem(CLAVE_TOKEN) ?? 'null') as Token | null
    return t && t.vence > Date.now() + 60_000 ? t : null
  } catch {
    return null
  }
}

function borrarToken() {
  try {
    localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    /* sin almacenamiento */
  }
}

let scriptGis: Promise<void> | null = null
function cargarGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  scriptGis ??= new Promise<void>((ok, mal) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => ok()
    s.onerror = () => {
      scriptGis = null
      mal(new Error('No se pudo cargar Google. Revisá tu conexión a internet.'))
    }
    document.head.appendChild(s)
  })
  return scriptGis
}

/** Abre la ventanita de Google para dar permiso. Tiene que llamarse desde un clic. */
async function pedirToken(primeraVez: boolean): Promise<string> {
  if (!CLIENT_ID) throw new Error('Falta configurar el ID de cliente de Google (VITE_GOOGLE_CLIENT_ID).')
  await cargarGis()
  return new Promise<string>((ok, mal) => {
    const cliente = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: PERMISOS.join(' '),
      callback: (r) => {
        if (r.error || !r.access_token) return mal(new Error('Google no dio permiso.'))
        if (!window.google!.accounts.oauth2.hasGrantedAllScopes(r, PERMISOS[0], PERMISOS[1])) {
          return mal(new Error('Hace falta permitir "ver tus calendarios" y "ver los eventos". Probá de nuevo y dejá tildadas todas las casillas.'))
        }
        const t: Token = { token: r.access_token, vence: Date.now() + Number(r.expires_in ?? 3600) * 1000 }
        try {
          localStorage.setItem(CLAVE_TOKEN, JSON.stringify(t))
        } catch {
          /* sin almacenamiento: dura lo que dure la pestaña */
        }
        tokenEnMemoria = t
        ok(t.token)
      },
      error_callback: (e) =>
        mal(new Error(e.type === 'popup_closed' ? 'Se cerró la ventana de Google antes de terminar.' : e.type === 'popup_failed_to_open' ? 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio.' : 'No se pudo conectar con Google.')),
    })
    cliente.requestAccessToken({ prompt: primeraVez ? 'consent' : '' })
  })
}

let tokenEnMemoria: Token | null = null
function tokenVigente(): string | null {
  const t = tokenEnMemoria && tokenEnMemoria.vence > Date.now() + 60_000 ? tokenEnMemoria : tokenGuardado()
  tokenEnMemoria = t
  return t?.token ?? null
}

// ---------- Llamadas a la API ----------

class ErrorApi extends Error {
  estado: number
  constructor(estado: number) {
    super(`Google respondió ${estado}`)
    this.estado = estado
  }
}

async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = tokenVigente()
  if (!token) throw new NecesitaReconectar()
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opciones.headers },
  })
  if (r.status === 401) {
    tokenEnMemoria = null
    borrarToken()
    throw new NecesitaReconectar()
  }
  if (!r.ok) throw new ErrorApi(r.status)
  return (r.status === 204 ? undefined : await r.json()) as T
}

async function listarCalendariosApi(): Promise<CalendarioApi[]> {
  const r = await api<{ items?: CalendarioApi[] }>('/users/me/calendarList?minAccessRole=reader')
  return r.items ?? []
}

async function eventosDe(calId: string): Promise<EventoApi[]> {
  const hoy = hoyISO()
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
    timeMin: new Date(sumarDias(hoy, -DIAS_ATRAS) + 'T00:00:00').toISOString(),
    timeMax: new Date(sumarDias(hoy, DIAS_ADELANTE) + 'T00:00:00').toISOString(),
  })
  const todos: EventoApi[] = []
  let pagina: string | undefined
  do {
    if (pagina) params.set('pageToken', pagina)
    const r = await api<{ items?: EventoApi[]; nextPageToken?: string }>(`/calendars/${encodeURIComponent(calId)}/events?${params}`)
    todos.push(...(r.items ?? []))
    pagina = r.nextPageToken
  } while (pagina && todos.length < 10_000)
  return todos
}

const zona = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires'

/** Devuelve el id del calendario "Quesito" en Google, creándolo si no existe. */
async function calendarioQuesito(a: AjustesGoogle): Promise<string> {
  if (a.quesitoCalId) {
    try {
      await api(`/calendars/${encodeURIComponent(a.quesitoCalId)}`)
      return a.quesitoCalId
    } catch (e) {
      if (!(e instanceof ErrorApi && (e.estado === 404 || e.estado === 410 || e.estado === 403))) throw e
    }
  }
  const cal = await api<{ id: string }>('/calendars', { method: 'POST', body: JSON.stringify({ summary: NOMBRE_APP, description: `Eventos creados en ${NOMBRE_APP}`, timeZone: zona() }) })
  // El calendario es nuevo: los eventos enviados antes ya no existen ahí.
  await db.eventos.toCollection().modify((e: Evento) => {
    delete e.googleId
    delete e.googleEnviado
  })
  return cal.id
}

async function enviarEventos(calId: string): Promise<number> {
  const pendientes = (await db.eventos.toArray()).filter(pendienteDeEnvio)
  const base = `/calendars/${encodeURIComponent(calId)}/events`
  for (const e of pendientes) {
    if (e.borrado) {
      try {
        await api(`${base}/${e.googleId}`, { method: 'DELETE' })
      } catch (err) {
        if (!(err instanceof ErrorApi && (err.estado === 404 || err.estado === 410))) throw err
      }
      await db.eventos.update(e.id, { googleEnviado: e.actualizado })
      continue
    }
    const cuerpo = JSON.stringify(aGoogle(e, zona()))
    let googleId = e.googleId
    if (googleId) {
      try {
        await api(`${base}/${googleId}`, { method: 'PUT', body: cuerpo })
      } catch (err) {
        if (!(err instanceof ErrorApi && (err.estado === 404 || err.estado === 410))) throw err
        googleId = undefined
      }
    }
    if (!googleId) googleId = (await api<{ id: string }>(base, { method: 'POST', body: cuerpo })).id
    await db.eventos.update(e.id, { googleId, googleEnviado: e.actualizado })
  }
  return pendientes.length
}

async function traerEventos(a: AjustesGoogle): Promise<number> {
  const elegidos = a.calendarios.filter((c) => c.elegido && c.id !== a.quesitoCalId)
  const filas: EventoGoogle[] = []
  for (const c of elegidos) {
    for (const ev of await eventosDe(c.id)) filas.push(...deGoogle(ev, { id: c.id, nombre: c.nombre, color: c.color }))
  }
  await db.transaction('rw', db.eventosGoogle, async () => {
    await db.eventosGoogle.clear()
    await db.eventosGoogle.bulkPut(filas)
  })
  return filas.length
}

/** Actualiza la lista de calendarios, conservando lo que ya elegiste. Los nuevos vienen sin elegir, salvo el principal. */
async function refrescarCalendarios(a: AjustesGoogle): Promise<CalendarioElegible[]> {
  const previos = new Map(a.calendarios.map((c) => [c.id, c.elegido]))
  return (await listarCalendariosApi())
    .filter((c) => c.id !== a.quesitoCalId)
    .map((c) => ({ id: c.id, nombre: nombreCalendario(c), color: c.backgroundColor || '#7FA8E0', elegido: previos.get(c.id) ?? !!c.primary }))
}

// ---------- Acciones ----------

let enCurso: Promise<void> | null = null

/**
 * Envía y trae todo. Si el permiso venció: con `interactivo` abre la ventanita de Google;
 * sin `interactivo` queda en "reconectar" hasta que toques el botón.
 */
export function sincronizar(interactivo = false): Promise<void> {
  enCurso ??= (async () => {
    try {
      let a = await leerAjustesGoogle()
      if (!a.conectado) return
      if (!tokenVigente()) {
        if (!interactivo) throw new NecesitaReconectar()
        await pedirToken(false)
      }
      setEstado({ fase: 'sincronizando', mensaje: '' })
      a = { ...a, calendarios: await refrescarCalendarios(a) }
      if (a.enviar) {
        a.quesitoCalId = await calendarioQuesito(a)
        a.calendarios = a.calendarios.filter((c) => c.id !== a.quesitoCalId)
        await enviarEventos(a.quesitoCalId)
      }
      await traerEventos(a)
      a.ultimaSinc = new Date().toISOString()
      // Pudo cambiar mientras tanto (por ejemplo, desconectar): solo se guarda si sigue conectado.
      const actual = await leerAjustesGoogle()
      if (actual.conectado) {
        const elegidos = new Map(actual.calendarios.map((c) => [c.id, c.elegido]))
        await guardarAjustesGoogle({
          ...a,
          enviar: actual.enviar,
          calendarios: a.calendarios.map((c) => ({ ...c, elegido: elegidos.get(c.id) ?? c.elegido })),
        })
      }
      setEstado({ fase: 'inactivo', mensaje: '' })
    } catch (e) {
      if (e instanceof NecesitaReconectar) setEstado({ fase: 'reconectar', mensaje: 'El permiso de Google venció (dura 1 hora). Tocá "Actualizar ahora" para renovarlo.' })
      else setEstado({ fase: 'error', mensaje: e instanceof Error ? e.message : 'Algo salió mal con Google.' })
    } finally {
      enCurso = null
    }
  })()
  return enCurso
}

/** Primera conexión: pide permiso y trae los calendarios. */
export async function conectar(): Promise<void> {
  try {
    await pedirToken(true)
    const previo = await leerAjustesGoogle()
    await guardarAjustesGoogle({ ...previo, conectado: true })
    await sincronizar(false)
  } catch (e) {
    setEstado({ fase: 'error', mensaje: e instanceof Error ? e.message : 'No se pudo conectar con Google.' })
  }
}

export async function desconectar() {
  const token = tokenVigente()
  tokenEnMemoria = null
  borrarToken()
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {})
  const a = await leerAjustesGoogle()
  // Se guarda el calendario "Quesito" por si volvés a conectar la misma cuenta.
  await guardarAjustesGoogle({ ...AJUSTES_GOOGLE_INICIALES, quesitoCalId: a.quesitoCalId, enviar: a.enviar })
  await db.eventosGoogle.clear()
  setEstado({ fase: 'inactivo', mensaje: '' })
}

export async function elegirCalendario(id: string, elegido: boolean) {
  const a = await leerAjustesGoogle()
  await guardarAjustesGoogle({ ...a, calendarios: a.calendarios.map((c) => (c.id === id ? { ...c, elegido } : c)) })
  if (!elegido) await db.eventosGoogle.where('calendarioId').equals(id).delete()
  void sincronizar(false)
}

export async function cambiarEnvio(enviar: boolean) {
  const a = await leerAjustesGoogle()
  await guardarAjustesGoogle({ ...a, enviar })
  if (enviar) void sincronizar(false)
}

export const hayPermisoVigente = () => !!tokenVigente()
