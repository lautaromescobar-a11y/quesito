import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CheckinAnimo from '../components/CheckinAnimo'
import PadPin from '../components/PadPin'
import { botonChico, botonPeligro, campo } from '../components/ui'
import { bloqueo, useDesbloqueado } from '../lib/bloqueo'
import { db, guardarAjuste, leerAjuste, type EntradaDiario } from '../lib/db'
import { agregarPregunta, buscarEntradas, esperaRestante, etiquetasUsadas, limpiarEtiqueta, MAX_INTENTOS, PREGUNTAS, recuerdos, resumen } from '../lib/diario'
import { borrarEntrada, guardarEntrada, verificarPin } from '../lib/diarioDb'
import { fechaCorta, fechaLarga, deISO, hoyISO } from '../lib/fechas'
import { sumarDias } from '../lib/rachas'

// ---------- Bloqueo ----------

function Bloqueado() {
  const [espera, setEspera] = useState(() => esperaRestante(bloqueo.fallos(), bloqueo.ultimoFallo(), Date.now()))
  useEffect(() => {
    if (!espera) return
    const id = setInterval(() => setEspera(esperaRestante(bloqueo.fallos(), bloqueo.ultimoFallo(), Date.now())), 500)
    return () => clearInterval(id)
  }, [espera])

  const probar = async (pin: string) => {
    if (await verificarPin(pin)) {
      bloqueo.desbloquear()
      return
    }
    bloqueo.registrarFallo()
    const quedan = MAX_INTENTOS - bloqueo.fallos()
    setEspera(esperaRestante(bloqueo.fallos(), bloqueo.ultimoFallo(), Date.now()))
    return quedan > 0 ? `PIN incorrecto. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.` : 'PIN incorrecto.'
  }

  return (
    <div className="mx-auto max-w-md rounded-[20px] bg-superficie/60 p-6">
      <PadPin titulo="Diario bloqueado" subtitulo="Ingresá tu PIN de 4 números" alCompletar={probar} bloqueadoMs={espera} />
      <p className="text-center text-sm text-texto-suave">
        ¿Te olvidaste el PIN? Mirá las opciones en <Link to="/ajustes" className="font-medium text-acento">Ajustes</Link>.
      </p>
    </div>
  )
}

// ---------- Editor de un día ----------

function EditorDia({ fecha, entrada, sugerencias, alIrA }: { fecha: string; entrada: EntradaDiario | undefined; sugerencias: string[]; alIrA: (f: string) => void }) {
  const [titulo, setTitulo] = useState(entrada?.titulo ?? '')
  const [texto, setTexto] = useState(entrada?.texto ?? '')
  const [etiquetas, setEtiquetas] = useState<string[]>(entrada?.etiquetas ?? [])
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [estado, setEstado] = useState<'guardado' | 'pendiente' | 'guardando'>('guardado')
  const [confirmar, setConfirmar] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const ultimo = useRef({ titulo, texto, etiquetas })
  ultimo.current = { titulo, texto, etiquetas }
  const primeraVez = useRef(true)
  const pendiente = useRef(false)

  // Guardado automático 700 ms después de dejar de escribir.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    setEstado('pendiente')
    pendiente.current = true
    const id = setTimeout(async () => {
      setEstado('guardando')
      pendiente.current = false
      await guardarEntrada(fecha, ultimo.current)
      setEstado('guardado')
    }, 700)
    return () => clearTimeout(id)
  }, [titulo, texto, etiquetas, fecha])

  // Si se cambia de día o de pantalla con algo sin guardar, se guarda igual.
  useEffect(() => {
    return () => {
      if (pendiente.current) void guardarEntrada(fecha, ultimo.current)
    }
  }, [fecha])

  // El área de texto crece con el contenido.
  useEffect(() => {
    const a = area.current
    if (!a) return
    a.style.height = 'auto'
    a.style.height = `${Math.max(320, a.scrollHeight)}px`
  }, [texto])

  const agregarEtiqueta = (t: string) => {
    const limpia = limpiarEtiqueta(t)
    if (limpia && !etiquetas.includes(limpia)) setEtiquetas([...etiquetas, limpia])
    setNuevaEtiqueta('')
  }

  const teclaEtiqueta = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      agregarEtiqueta(nuevaEtiqueta)
    } else if (e.key === 'Backspace' && !nuevaEtiqueta && etiquetas.length) {
      setEtiquetas(etiquetas.slice(0, -1))
    }
  }

  const pregunta = (p: string) => {
    const a = area.current
    const nuevo = agregarPregunta(a?.value ?? texto, p)
    setTexto(nuevo)
    if (a) {
      // Se escribe directo en el campo y se mueve el cursor al final, para poder seguir tipeando sin perder letras.
      a.value = nuevo
      a.focus()
      a.selectionStart = a.selectionEnd = nuevo.length
    }
  }

  const borrar = async () => {
    primeraVez.current = true
    pendiente.current = false
    setTitulo('')
    setTexto('')
    setEtiquetas([])
    ultimo.current = { titulo: '', texto: '', etiquetas: [] }
    await borrarEntrada(fecha)
    setConfirmar(false)
    setEstado('guardado')
  }

  const palabras = texto.trim() ? texto.trim().split(/\s+/).length : 0
  const sugeridas = sugerencias.filter((s) => !etiquetas.includes(s) && (!nuevaEtiqueta || s.includes(limpiarEtiqueta(nuevaEtiqueta)))).slice(0, 6)

  return (
    <div className="flex flex-col gap-5">
      <input
        aria-label="Título de la entrada"
        className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-texto-suave/60"
        placeholder="Título (opcional)"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-texto-suave">Para arrancar:</span>
        {PREGUNTAS.map((p) => (
          <button key={p.corto} type="button" className="rounded-full border border-borde px-3 py-1 text-sm hover:border-acento hover:bg-acento-suave" onClick={() => pregunta(p.texto)} title={p.texto}>
            {p.corto}
          </button>
        ))}
      </div>

      <label htmlFor="texto-diario" className="sr-only">Texto de la entrada</label>
      <textarea
        ref={area}
        id="texto-diario"
        className="min-h-80 w-full resize-none rounded-2xl border border-borde bg-superficie px-5 py-4 text-[16px] leading-relaxed outline-none focus:border-acento"
        placeholder="¿Cómo estuvo tu día? Escribí lo que quieras: nadie más lo ve."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-borde bg-superficie px-3 py-2 focus-within:border-acento">
          {etiquetas.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-acento-suave px-2.5 py-0.5 text-sm text-acento-fuerte">
              #{t}
              <button type="button" onClick={() => setEtiquetas(etiquetas.filter((x) => x !== t))} aria-label={`Quitar etiqueta ${t}`} className="px-0.5 text-texto-suave hover:text-texto">×</button>
            </span>
          ))}
          <label htmlFor="etiqueta-nueva" className="sr-only">Agregar etiqueta</label>
          <input
            id="etiqueta-nueva"
            className="min-w-40 flex-1 bg-transparent py-1 text-sm outline-none"
            placeholder={etiquetas.length ? 'Otra etiqueta…' : 'Etiquetas: facu, familia, gym… (Enter para agregar)'}
            value={nuevaEtiqueta}
            onChange={(e) => setNuevaEtiqueta(e.target.value)}
            onKeyDown={teclaEtiqueta}
            onBlur={() => nuevaEtiqueta && agregarEtiqueta(nuevaEtiqueta)}
          />
        </div>
        {sugeridas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sugeridas.map((s) => (
              <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => agregarEtiqueta(s)} className="rounded-full px-2 py-0.5 text-xs text-texto-suave hover:bg-acento-suave hover:text-texto">
                + #{s}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-2xl bg-superficie p-5">
        <h3 className="mb-3 text-sm font-semibold">¿Cómo estuvo el día?</h3>
        <CheckinAnimo fecha={fecha} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-texto-suave">
        <span aria-live="polite">
          {estado === 'guardado' ? (entrada || texto || titulo ? 'Guardado' : 'Todavía no escribiste nada') : 'Guardando…'} · {palabras} {palabras === 1 ? 'palabra' : 'palabras'}
        </span>
        {(entrada || texto || titulo) &&
          (confirmar ? (
            <span className="flex items-center gap-2">
              ¿Borrar la entrada de este día?
              <button type="button" className={`${botonPeligro} min-h-9 text-sm`} onClick={borrar}>Sí, borrar</button>
              <button type="button" className={botonChico} onClick={() => setConfirmar(false)}>No</button>
            </span>
          ) : (
            <button type="button" className={botonChico} onClick={() => setConfirmar(true)}>Borrar entrada</button>
          ))}
      </div>

      {fecha !== hoyISO() && (
        <button type="button" className="self-start text-sm font-medium text-acento" onClick={() => alIrA(hoyISO())}>
          Ir a hoy →
        </button>
      )}
    </div>
  )
}

// ---------- Pantalla ----------

function ContenidoDiario({ pinActivo }: { pinActivo: boolean }) {
  const [params, setParams] = useSearchParams()
  const hoy = hoyISO()
  const fecha = params.get('fecha') && params.get('fecha')! <= hoy ? params.get('fecha')! : hoy
  const [busqueda, setBusqueda] = useState('')
  const [etiqueta, setEtiqueta] = useState<string | undefined>()
  const avisoPinOculto = useLiveQuery(() => leerAjuste('avisoPinOculto', false))
  const entradas = useLiveQuery(() => db.diario.filter((e) => !e.borrado).toArray())
  const checkins = useLiveQuery(() => db.animo.filter((c) => !c.borrado).toArray())
  if (!entradas || !checkins) return null

  const irA = (f: string) => setParams({ fecha: f }, { replace: true })
  const entrada = entradas.find((e) => e.fecha === fecha)
  const lista = buscarEntradas(entradas, busqueda, etiqueta)
  const etiquetas = etiquetasUsadas(entradas)
  const animoPorFecha = new Map(checkins.map((c) => [c.fecha, c.animo]))
  const anioActual = hoy.slice(0, 4)
  const memorias = recuerdos(entradas, fecha)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[38px] font-semibold tracking-tight">Diario</h1>
          <p className="text-[15px] text-texto-suave">{entradas.length} {entradas.length === 1 ? 'entrada' : 'entradas'} · se guarda solo mientras escribís</p>
        </div>
        {pinActivo && (
          <button type="button" className={botonChico} onClick={() => bloqueo.bloquear()}>
            Bloquear diario
          </button>
        )}
      </header>

      {!pinActivo && !avisoPinOculto && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-acento-suave px-5 py-3 text-sm text-acento-fuerte">
          Tu diario no tiene PIN. <Link to="/ajustes" className="font-semibold underline">Crear un PIN de 4 números</Link>
          <button type="button" className="ml-auto text-texto-suave underline" onClick={() => guardarAjuste('avisoPinOculto', true)}>No mostrar más</button>
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        {/* Lista y búsqueda */}
        <aside className="flex w-full flex-col gap-3 md:sticky md:top-0 md:w-80">
          <label htmlFor="buscar-diario" className="sr-only">Buscar en el diario</label>
          <input id="buscar-diario" type="search" className={`${campo} w-full`} placeholder="Buscar en el diario…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {etiquetas.slice(0, 12).map((t) => (
                <button
                  key={t.etiqueta}
                  type="button"
                  aria-pressed={etiqueta === t.etiqueta}
                  onClick={() => setEtiqueta(etiqueta === t.etiqueta ? undefined : t.etiqueta)}
                  className={`rounded-full px-2.5 py-0.5 text-xs ${etiqueta === t.etiqueta ? 'bg-acento font-semibold text-sobre-acento' : 'bg-superficie text-texto-suave hover:text-texto'}`}
                >
                  #{t.etiqueta} <span className="opacity-70">{t.veces}</span>
                </button>
              ))}
            </div>
          )}
          <ul className="flex max-h-[65vh] flex-col gap-1 overflow-y-auto rounded-[20px] bg-superficie p-2">
            {!entrada && !busqueda && !etiqueta && (
              <li>
                <button type="button" onClick={() => irA(fecha)} className="w-full rounded-xl bg-acento-suave px-3 py-2.5 text-left">
                  <span className="block text-xs font-semibold text-acento-fuerte">{fecha === hoy ? 'Hoy' : fechaCorta(fecha)}</span>
                  <span className="block text-sm text-texto-suave">Nueva entrada</span>
                </button>
              </li>
            )}
            {lista.map((e) => {
              const animo = animoPorFecha.get(e.fecha)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => irA(e.fecha)}
                    aria-current={e.fecha === fecha ? 'true' : undefined}
                    className={`w-full rounded-xl px-3 py-2.5 text-left ${e.fecha === fecha ? 'bg-acento-suave' : 'hover:bg-acento-suave/50'}`}
                  >
                    <span className="flex items-center justify-between text-xs text-texto-suave">
                      <span className={e.fecha === fecha ? 'font-semibold text-acento-fuerte' : ''}>
                        {e.fecha === hoy ? 'Hoy' : fechaCorta(e.fecha)}
                        {e.fecha.slice(0, 4) !== anioActual && ` ${e.fecha.slice(0, 4)}`}
                      </span>
                      {animo && <span title={`Ánimo ${animo} de 5`}>Ánimo {animo}/5</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm">{resumen(e) || 'Sin texto'}</span>
                    {e.etiquetas.length > 0 && <span className="mt-0.5 block truncate text-xs text-acento">{e.etiquetas.map((t) => `#${t}`).join(' ')}</span>}
                  </button>
                </li>
              )
            })}
            {lista.length === 0 && (busqueda || etiqueta) && <li className="px-3 py-4 text-sm text-texto-suave">No hay entradas que coincidan.</li>}
          </ul>
        </aside>

        {/* Editor */}
        <section className="min-w-0 flex-[999_1_480px] space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={botonChico} onClick={() => irA(sumarDias(fecha, -1))} aria-label="Día anterior">←</button>
            <button type="button" className={botonChico} onClick={() => irA(sumarDias(fecha, 1))} aria-label="Día siguiente" disabled={fecha >= hoy}>→</button>
            <h2 className="ml-1 text-lg font-semibold">
              {fecha === hoy ? 'Hoy · ' : ''}
              {fechaLarga(deISO(fecha))}
              {fecha.slice(0, 4) !== anioActual && ` de ${fecha.slice(0, 4)}`}
            </h2>
            <label htmlFor="ir-fecha" className="sr-only">Ir a una fecha</label>
            <input id="ir-fecha" type="date" max={hoy} className={`${campo} ml-auto py-1.5 text-sm`} value={fecha} onChange={(e) => e.target.value && irA(e.target.value)} />
          </div>

          {memorias.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {memorias.map((m) => (
                <button key={m.cuando} type="button" onClick={() => irA(m.entrada.fecha)} className="rounded-2xl border border-dashed border-acento/50 px-4 py-3 text-left hover:bg-acento-suave/50">
                  <span className="block text-xs font-semibold text-acento-fuerte">{m.cuando} escribiste</span>
                  <span className="block truncate text-sm">{resumen(m.entrada)}</span>
                </button>
              ))}
            </div>
          )}

          <EditorDia key={fecha} fecha={fecha} entrada={entrada} sugerencias={etiquetas.map((t) => t.etiqueta)} alIrA={irA} />
        </section>
      </div>
    </div>
  )
}

export default function Diario() {
  const pinActivo = useLiveQuery(async () => !!(await leerAjuste('pinDiario', null)))
  const desbloqueado = useDesbloqueado()
  useEffect(() => () => bloqueo.salir(), [])

  if (pinActivo === undefined) return null
  if (pinActivo && !desbloqueado) return <Bloqueado />
  return <ContenidoDiario pinActivo={pinActivo} />
}
