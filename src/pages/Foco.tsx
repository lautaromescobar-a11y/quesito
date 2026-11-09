import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import Ratoncito from '../components/Ratoncito'
import Tarjeta from '../components/Tarjeta'
import { useAbrirSola, VentanitaControles } from '../components/VentanitaFoco'
import { ventanita } from '../lib/ventanita'
import { botonChico, botonPrincipal, botonSecundario, campo } from '../components/ui'
import { NOMBRE_APP } from '../lib/app'
import { db } from '../lib/db'
import { hoyISO } from '../lib/fechas'
import { foco, useFoco } from '../lib/foco'
import { duracionMs, formatoReloj, NOMBRE_FASE, restante, type ConfigFoco, type Fase, type Vinculo } from '../lib/focoLogica'
import { sumarDias } from '../lib/rachas'
import { ambiente, SONIDOS_GENERADOS, sonarCampana, type TipoSonido } from '../lib/sonidos'
import { agendaDelDia, useDatosAgenda } from '../lib/useAgenda'
import { agregarMusica, guardarPrefSonido, quitarMusica, useMusica, usePrefSonido } from '../lib/usePrefs'

function useAhora(cadaMs = 250) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), cadaMs)
    return () => clearInterval(id)
  }, [cadaMs])
  return ahora
}

function Reloj() {
  const { estado, config } = useFoco()
  const abrirSola = useAbrirSola()
  const empezar = () => {
    foco.iniciar()
    // Se abre dentro del clic: el navegador solo permite abrir la ventanita con un gesto del usuario.
    if (abrirSola && !ventanita.abierta()) void ventanita.abrir()
  }
  const ahora = useAhora()
  const falta = restante(estado, ahora)
  const total = duracionMs(estado.fase, config)
  const avance = total ? 1 - falta / total : 0
  const R = 120
  const largo = 2 * Math.PI * R
  const colorAnillo = estado.fase === 'foco' ? 'var(--color-acento)' : '#7FA8E0'

  useEffect(() => {
    document.title = estado.estado === 'detenido' ? NOMBRE_APP : `${formatoReloj(falta)} · ${NOMBRE_FASE[estado.fase]} · ${NOMBRE_APP}`
    return () => {
      document.title = NOMBRE_APP
    }
  }, [falta, estado.estado, estado.fase])

  const modo = estado.estado === 'corriendo' ? (estado.fase === 'foco' ? 'estudia' : 'descansa') : 'espera'
  const mensajeRaton =
    modo === 'estudia' ? 'Estudiando con vos…' : modo === 'descansa' ? 'Siesta corta. ¡Vos también descansá!' : estado.estado === 'pausado' ? 'Te espero acá.' : '¿Arrancamos?'

  return (
    <div className="flex flex-col items-center gap-6">
      <div role="tablist" aria-label="Tipo de período" className="flex gap-1 rounded-xl bg-fondo p-1">
        {(['foco', 'pausa', 'pausaLarga'] as Fase[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={estado.fase === f}
            disabled={estado.estado === 'corriendo'}
            onClick={() => foco.elegirFase(f)}
            className={`min-h-10 rounded-lg px-4 text-[15px] disabled:cursor-not-allowed ${estado.fase === f ? 'bg-superficie font-semibold shadow-sm' : 'text-texto-suave'}`}
          >
            {NOMBRE_FASE[f]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
      <figure className="flex flex-col items-center">
        <Ratoncito modo={modo} tamano={230} />
        <figcaption className="mt-1 text-sm text-texto-suave">{mensajeRaton}</figcaption>
      </figure>
      <div className="relative">
        <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden>
          <circle cx="140" cy="140" r={R} fill="none" stroke="var(--color-pista)" strokeWidth="12" />
          <circle cx="140" cy="140" r={R} fill="none" stroke={colorAnillo} strokeWidth="12" strokeLinecap="round" strokeDasharray={largo} strokeDashoffset={largo * (1 - avance)} transform="rotate(-90 140 140)" style={{ transition: 'stroke-dashoffset 0.3s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-semibold tabular-nums tracking-tight" role="timer" aria-live="off">{formatoReloj(falta)}</span>
          <span className="mt-1 text-sm text-texto-suave">{estado.estado === 'pausado' ? 'En pausa' : NOMBRE_FASE[estado.fase]}</span>
        </div>
      </div>
      </div>

      <div className="flex gap-1.5" aria-label={`Foco ${estado.ciclo} de ${config.cadaCuantos} antes de la pausa larga`}>
        {Array.from({ length: config.cadaCuantos }, (_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < estado.ciclo ? 'bg-acento' : 'bg-pista'}`} />
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {estado.estado === 'corriendo' ? (
          <button type="button" className={`${botonPrincipal} min-w-36`} onClick={foco.pausar}>Pausar</button>
        ) : (
          <button type="button" className={`${botonPrincipal} min-w-36`} onClick={empezar}>{estado.estado === 'pausado' ? 'Reanudar' : 'Empezar'}</button>
        )}
        <button type="button" className={botonSecundario} onClick={foco.reiniciar} disabled={estado.estado === 'detenido'}>Reiniciar</button>
        <button type="button" className={botonSecundario} onClick={foco.saltar}>Saltar</button>
      </div>
    </div>
  )
}

function ElegirVinculo() {
  const { estado } = useFoco()
  const datos = useDatosAgenda()
  const [libre, setLibre] = useState(estado.vinculo.tipo === 'libre' ? estado.vinculo.titulo : '')
  if (!datos) return null
  const hoy = hoyISO()
  const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes()
  const bloques = agendaDelDia(datos, hoy).items.filter((i) => i.tipo === 'rutina' && Number(i.fin.slice(0, 2)) * 60 + Number(i.fin.slice(3)) > ahoraMin)
  const tareas = datos.tareas.filter((t) => t.estado !== 'hecha').sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'))

  const valor = estado.vinculo.tipo === 'libre' ? 'libre' : `${estado.vinculo.tipo}:${estado.vinculo.id}`
  const elegir = (v: string) => {
    if (v === 'libre') return foco.vincular({ tipo: 'libre', id: null, titulo: libre })
    const [tipo, id] = v.split(':') as [Vinculo['tipo'], string]
    const titulo = tipo === 'bloque' ? bloques.find((b) => b.bloqueId === id || b.clave === id)?.titulo : tareas.find((t) => t.id === id)?.titulo
    foco.vincular({ tipo, id, titulo: titulo ?? '' })
  }

  return (
    <div className="space-y-3">
      <label htmlFor="vinculo" className="sr-only">¿En qué te enfocás?</label>
      <select id="vinculo" className={`${campo} w-full`} value={valor} onChange={(e) => elegir(e.target.value)}>
        <option value="libre">Algo libre (escribilo abajo)</option>
        {bloques.length > 0 && (
          <optgroup label="Rutina de hoy">
            {bloques.map((b) => (
              <option key={b.clave} value={`bloque:${b.bloqueId ?? b.clave}`}>{b.inicio}–{b.fin} · {b.titulo}</option>
            ))}
          </optgroup>
        )}
        {tareas.length > 0 && (
          <optgroup label="Tareas pendientes">
            {tareas.map((t) => (
              <option key={t.id} value={`tarea:${t.id}`}>{t.titulo}</option>
            ))}
          </optgroup>
        )}
      </select>
      {estado.vinculo.tipo === 'libre' && (
        <input
          aria-label="Descripción libre del foco"
          className={`${campo} w-full`}
          placeholder="Ej.: Ejercicios de Campos, repasar francés…"
          value={libre}
          onChange={(e) => setLibre(e.target.value)}
          onBlur={() => foco.vincular({ tipo: 'libre', id: null, titulo: libre.trim() })}
        />
      )}
    </div>
  )
}

function Sonidos() {
  const pref = usePrefSonido()
  const musica = useMusica()
  const { estado } = useFoco()
  const [probando, setProbando] = useState<TipoSonido | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState('')
  const timer = useRef<number>(undefined)
  const guardarVol = useRef<number>(undefined)
  const [volumen, setVolumen] = useState<number | null>(null)
  const [enPausasLocal, setEnPausas] = useState<boolean | null>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (pref && volumen === null) setVolumen(pref.volumen)
  }, [pref, volumen])
  if (!pref || !musica || volumen === null) return null
  const enPausas = enPausasLocal ?? pref.enPausas

  /** El volumen cambia al instante en lo que suena y se guarda un momento después. */
  const cambiarVolumen = (v: number) => {
    setVolumen(v)
    ambiente.volumen(v)
    window.clearTimeout(guardarVol.current)
    guardarVol.current = window.setTimeout(() => guardarPrefSonido({ ...pref, volumen: v }), 250)
  }

  const opciones: { tipo: TipoSonido; nombre: string; detalle?: string; blob?: Blob }[] = [
    { tipo: 'silencio', nombre: 'Silencio' },
    ...SONIDOS_GENERADOS,
    ...musica.map((m) => ({ tipo: `musica:${m.id}` as TipoSonido, nombre: m.nombre, detalle: 'Tu música', blob: m.blob })),
  ]
  const enUso = estado.estado === 'corriendo'

  const probar = (o: (typeof opciones)[number]) => {
    window.clearTimeout(timer.current)
    if (probando === o.tipo) {
      ambiente.detener()
      setProbando(null)
      return
    }
    ambiente.reproducir(o.tipo, volumen, o.blob)
    setProbando(o.tipo)
    timer.current = window.setTimeout(() => {
      if (!enUso) ambiente.detener()
      setProbando(null)
    }, 8000)
  }

  const subir = async (files: FileList | null) => {
    if (!files?.length) return
    const lista = [...files].filter((f) => f.type.startsWith('audio/'))
    const grandes = lista.filter((f) => f.size > 60 * 1024 * 1024)
    if (grandes.length) setAviso('Hay archivos de más de 60 MB: se guardan, pero ocupan bastante espacio.')
    else setAviso(lista.length ? '' : 'Elegí archivos de audio (mp3, m4a, ogg, wav).')
    if (lista.length) await agregarMusica(lista)
    if (archivo.current) archivo.current.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((o) => (
          <div key={o.tipo} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${pref.tipo === o.tipo ? 'border-acento bg-acento-suave' : 'border-borde'}`}>
            <button type="button" className="flex-1 text-left" aria-pressed={pref.tipo === o.tipo} onClick={() => guardarPrefSonido({ ...pref, volumen, tipo: o.tipo })}>
              <span className="block text-[15px] font-medium">{o.nombre}</span>
              {o.detalle && <span className="block text-xs text-texto-suave">{o.detalle}</span>}
            </button>
            {o.tipo !== 'silencio' && (
              <button type="button" className={botonChico} onClick={() => probar(o)} aria-label={`${probando === o.tipo ? 'Detener' : 'Probar'} ${o.nombre}`}>
                {probando === o.tipo ? 'Detener' : 'Probar'}
              </button>
            )}
            {o.tipo.startsWith('musica:') && (
              <button type="button" className={botonChico} onClick={() => quitarMusica(o.tipo.slice(7))} aria-label={`Quitar ${o.nombre}`}>×</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor="volumen" className="text-sm font-medium">Volumen</label>
        <input
          id="volumen"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volumen}
          onChange={(e) => cambiarVolumen(Number(e.target.value))}
          className="w-48 accent-[var(--color-acento)]"
        />
        <span className="w-10 text-sm tabular-nums text-texto-suave">{Math.round(volumen * 100)}%</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-acento)]" checked={enPausas}
            onChange={(e) => {
              setEnPausas(e.target.checked)
              void guardarPrefSonido({ ...pref, volumen, enPausas: e.target.checked })
            }} />
          Que suene también en las pausas
        </label>
      </div>

      <div className="rounded-xl bg-fondo px-4 py-3">
        <p className="text-sm">
          <strong>Tu música:</strong> subí archivos de audio de tu compu y se guardan en la app para usarlos sin internet.
        </p>
        <input ref={archivo} id="subir-musica" type="file" accept="audio/*" multiple className="sr-only" onChange={(e) => subir(e.target.files)} />
        <label htmlFor="subir-musica" className={`${botonChico} mt-2 inline-flex cursor-pointer items-center`}>Subir música</label>
        {aviso && <p className="mt-2 text-xs text-texto-suave">{aviso}</p>}
      </div>
      <p className="text-xs text-texto-suave">El sonido arranca y para solo con el reloj. Los sonidos de la lista los genera la app: no necesitan internet.</p>
    </div>
  )
}

function Configuracion() {
  const { config } = useFoco()
  const [c, setC] = useState<ConfigFoco>(config)
  useEffect(() => setC(config), [config])
  const campoNum = (k: keyof Omit<ConfigFoco, 'autoSiguiente'>, etiqueta: string, min: number, max: number) => (
    <div>
      <label htmlFor={`cfg-${k}`} className="mb-1 block text-sm">{etiqueta}</label>
      <input id={`cfg-${k}`} type="number" min={min} max={max} className={`${campo} w-24`} value={c[k]} onChange={(e) => setC({ ...c, [k]: Math.min(max, Math.max(min, Number(e.target.value) || min)) })} onBlur={() => foco.configurar(c)} />
    </div>
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {campoNum('foco', 'Foco (min)', 1, 180)}
        {campoNum('pausa', 'Pausa corta (min)', 1, 60)}
        {campoNum('pausaLarga', 'Pausa larga (min)', 1, 90)}
        {campoNum('cadaCuantos', 'Focos por serie', 1, 12)}
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-acento)]" checked={c.autoSiguiente}
          onChange={(e) => {
            const nueva = { ...c, autoSiguiente: e.target.checked }
            setC(nueva)
            void foco.configurar(nueva)
          }} />
        Empezar la siguiente fase sola
      </label>
      <button type="button" className={botonChico} onClick={sonarCampana}>Probar sonido de fin</button>
    </div>
  )
}

function Historial() {
  const hoy = hoyISO()
  const sesiones = useLiveQuery(() => db.foco.where('fecha').between(sumarDias(hoy, -6), hoy, true, true).filter((s) => !s.borrado).toArray(), [hoy])
  if (!sesiones) return null
  const deHoy = sesiones.filter((s) => s.fecha === hoy).sort((a, b) => b.hora.localeCompare(a.hora))
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 6))
  const porDia = dias.map((d) => sesiones.filter((s) => s.fecha === d).reduce((n, s) => n + s.minutos, 0))
  const max = Math.max(60, ...porDia)
  const minutosHoy = porDia[6]

  return (
    <div className="space-y-5">
      <p className="text-[15px]">
        Hoy: <strong>{deHoy.length}</strong> {deHoy.length === 1 ? 'foco' : 'focos'} · <strong>{Math.floor(minutosHoy / 60) ? `${Math.floor(minutosHoy / 60)} h ` : ''}{minutosHoy % 60} min</strong>
      </p>
      <div className="flex h-32 items-end gap-2" role="img" aria-label={`Minutos de foco por día: ${porDia.join(', ')}`}>
        {dias.map((d, i) => (
          <div key={d} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] tabular-nums text-texto-suave">{porDia[i] || ''}</span>
            <div className={`w-full rounded-t-md ${d === hoy ? 'bg-acento' : 'bg-dia-hecho'}`} style={{ height: `${(porDia[i] / max) * 88}px`, minHeight: porDia[i] ? 4 : 0 }} />
            <span className="text-[11px] text-texto-suave">{['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(d + 'T12:00').getDay()]}</span>
          </div>
        ))}
      </div>
      {deHoy.length > 0 && (
        <ul>
          {deHoy.map((s) => (
            <li key={s.id} className="flex gap-3 border-t border-linea py-2 text-sm">
              <span className="w-12 tabular-nums text-texto-suave">{s.hora}</span>
              <span className="flex-1">{s.titulo || 'Foco libre'}</span>
              <span className="text-texto-suave">{s.minutos} min</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Foco() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-[38px] font-semibold tracking-tight">Foco</h1>
        <p className="text-[15px] text-texto-suave">Bloques de concentración con pausas. El reloj sigue aunque cambies de pantalla.</p>
      </header>

      <section className="rounded-[20px] bg-superficie p-7">
        <Reloj />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="¿En qué te enfocás?">
          <ElegirVinculo />
          <VentanitaControles />
        </Tarjeta>
        <Tarjeta titulo="Tu foco de la semana">
          <Historial />
        </Tarjeta>
      </div>

      <Tarjeta titulo="Sonido de fondo">
        <Sonidos />
      </Tarjeta>
      <Tarjeta titulo="Tiempos">
        <Configuracion />
      </Tarjeta>
    </div>
  )
}
