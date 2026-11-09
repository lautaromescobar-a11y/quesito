import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ResumenSemana from '../components/ResumenSemana'
import Tarjeta from '../components/Tarjeta'
import { botonChico, botonPrincipal, botonSecundario, campo } from '../components/ui'
import type { RevisionSemanal } from '../lib/db'
import { resumenSemana } from '../lib/estadisticas'
import { fechaCorta, hoyISO } from '../lib/fechas'
import { inicioSemana, sumarDias } from '../lib/rachas'
import { descargarRespaldo } from '../lib/respaldoDb'
import { guardarRevision, useDatosResumen, useRevisiones } from '../lib/useResumen'

export const PREGUNTAS_REVISION = [
  { id: 'bien', texto: '¿Qué salió bien esta semana?', ayuda: 'Aunque sea algo chico.' },
  { id: 'costo', texto: '¿Qué te costó o no salió como querías?', ayuda: 'Sin culparte: ¿qué lo hizo difícil?' },
  { id: 'ajuste', texto: '¿Qué vas a ajustar la semana que viene?', ayuda: 'Un cambio concreto: un horario, una versión mínima, preparar algo antes.' },
]

/** Semana que conviene revisar: de viernes a domingo la actual; de lunes a jueves, la anterior. */
export function semanaParaRevisar(hoy = hoyISO()): string {
  const dia = new Date(hoy + 'T12:00').getDay()
  return dia === 0 || dia >= 5 ? inicioSemana(hoy) : sumarDias(inicioSemana(hoy), -7)
}

function Formulario({ semana, existente }: { semana: string; existente: RevisionSemanal | undefined }) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(existente?.respuestas ?? {})
  const [prioridades, setPrioridades] = useState<string[]>(() => [...(existente?.prioridades ?? []), '', '', ''].slice(0, 3))
  const [crearTareas, setCrearTareas] = useState(!existente)
  const [guardada, setGuardada] = useState(!!existente)
  const [editando, setEditando] = useState(!existente)

  const guardar = async () => {
    await guardarRevision(semana, respuestas, prioridades, crearTareas)
    setGuardada(true)
    setEditando(false)
  }

  if (!editando && existente) {
    return (
      <div className="space-y-5">
        {PREGUNTAS_REVISION.map((p) => (
          <div key={p.id}>
            <p className="text-sm font-medium text-texto-suave">{p.texto}</p>
            <p className="mt-1 whitespace-pre-wrap text-[15px]">{existente.respuestas[p.id] || '—'}</p>
          </div>
        ))}
        {existente.prioridades.length > 0 && (
          <div>
            <p className="text-sm font-medium text-texto-suave">Prioridades de la semana siguiente</p>
            <ol className="mt-1 list-decimal pl-5 text-[15px]">
              {existente.prioridades.map((p) => <li key={p}>{p}</li>)}
            </ol>
          </div>
        )}
        {guardada && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-acento-suave px-4 py-3 text-sm text-acento-fuerte">
            <span className="flex-1">Revisión guardada. ¿Aprovechás para guardar un respaldo de tus datos?</span>
            <button type="button" className={`${botonChico} bg-superficie`} onClick={() => descargarRespaldo()}>Descargar respaldo</button>
          </div>
        )}
        <button type="button" className={botonSecundario} onClick={() => setEditando(true)}>Editar revisión</button>
      </div>
    )
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        void guardar()
      }}
    >
      {PREGUNTAS_REVISION.map((p, i) => (
        <div key={p.id}>
          <label htmlFor={`rev-${p.id}`} className="block text-[15px] font-semibold">
            {i + 1}. {p.texto}
          </label>
          <p className="mb-2 text-sm text-texto-suave">{p.ayuda}</p>
          <textarea id={`rev-${p.id}`} rows={3} className={`${campo} w-full`} value={respuestas[p.id] ?? ''} onChange={(e) => setRespuestas({ ...respuestas, [p.id]: e.target.value })} />
        </div>
      ))}

      <fieldset>
        <legend className="text-[15px] font-semibold">4. Tus 3 prioridades para la semana que viene</legend>
        <p className="mb-2 text-sm text-texto-suave">Lo más importante, no todo lo que hay que hacer.</p>
        <div className="space-y-2">
          {prioridades.map((p, i) => (
            <input
              key={i}
              aria-label={`Prioridad ${i + 1}`}
              className={`${campo} w-full`}
              placeholder={['Ej.: Terminar el TFI', 'Ej.: Ir al gimnasio 3 veces', 'Ej.: Dormir antes de las 24'][i]}
              value={p}
              onChange={(e) => setPrioridades(prioridades.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-acento)]" checked={crearTareas} onChange={(e) => setCrearTareas(e.target.checked)} />
          Agregarlas a Tareas (prioridad alta, para el domingo que viene)
        </label>
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className={botonPrincipal}>Guardar revisión</button>
        {existente && <button type="button" className={botonSecundario} onClick={() => setEditando(false)}>Cancelar</button>}
      </div>
    </form>
  )
}

export default function Revision() {
  const [params, setParams] = useSearchParams()
  const hoy = hoyISO()
  const semana = inicioSemana(params.get('semana') ?? semanaParaRevisar(hoy))
  const datos = useDatosResumen()
  const revisiones = useRevisiones()
  const ir = (s: string) => setParams({ semana: s }, { replace: true })

  useEffect(() => {
    window.scrollTo?.(0, 0)
  }, [semana])

  if (!datos || !revisiones) return null
  const r = resumenSemana(datos, semana, hoy)
  const existente = revisiones.find((x) => x.semana === semana)
  const anterior = revisiones.find((x) => x.semana === sumarDias(semana, -7))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-[38px] font-semibold tracking-tight">Revisión semanal</h1>
        <p className="text-[15px] text-texto-suave">Unos minutos para mirar la semana, sin juzgarte, y decidir qué ajustar.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={botonChico} onClick={() => ir(sumarDias(semana, -7))} aria-label="Semana anterior">←</button>
        <button type="button" className={botonChico} onClick={() => ir(sumarDias(semana, 7))} aria-label="Semana siguiente" disabled={semana >= inicioSemana(hoy)}>→</button>
        <h2 className="ml-1 text-lg font-semibold">
          Semana del {fechaCorta(r.lunes)} al {fechaCorta(r.domingo)}
        </h2>
        {existente && <span className="rounded-full bg-acento-suave px-2.5 py-0.5 text-xs font-semibold text-acento-fuerte">Hecha</span>}
      </div>

      <Tarjeta titulo="Así fue tu semana">
        <ResumenSemana r={r} />
      </Tarjeta>

      {anterior && anterior.prioridades.length > 0 && (
        <section className="rounded-[20px] border border-dashed border-acento/50 p-5">
          <p className="text-sm font-medium text-acento-fuerte">Tus prioridades para esta semana eran:</p>
          <ol className="mt-1 list-decimal pl-5 text-[15px]">
            {anterior.prioridades.map((p) => <li key={p}>{p}</li>)}
          </ol>
          {anterior.respuestas.ajuste && <p className="mt-2 text-sm text-texto-suave">Y querías ajustar: {anterior.respuestas.ajuste}</p>}
        </section>
      )}

      <Tarjeta titulo="Preguntas">
        <Formulario key={semana} semana={semana} existente={existente} />
      </Tarjeta>

      {revisiones.length > 0 && (
        <Tarjeta titulo="Revisiones anteriores">
          <ul>
            {revisiones.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => ir(x.semana)} className={`flex w-full gap-4 border-t border-linea py-3 text-left first:border-0 ${x.semana === semana ? 'font-semibold' : ''}`}>
                  <span className="w-44 shrink-0 text-sm">Semana del {fechaCorta(x.semana)}</span>
                  <span className="truncate text-sm text-texto-suave">{x.respuestas.bien || x.prioridades.join(' · ') || 'Sin texto'}</span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  )
}
