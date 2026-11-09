import { useState, type FormEvent } from 'react'
import FormularioTarea from '../components/FormularioTarea'
import { botonPrincipal } from '../components/ui'
import type { Tarea } from '../lib/db'
import { fechaRelativa, hoyISO } from '../lib/fechas'
import { cambiarTarea, guardarTarea } from '../lib/rutinaDb'
import { useDatosAgenda } from '../lib/useAgenda'
import { campo } from '../components/ui'

const PRIORIDAD = { alta: 0, media: 1, baja: 2 }

function ordenar(a: Tarea, b: Tarea) {
  const fa = a.fechaLimite ?? '9999'
  const fb = b.fechaLimite ?? '9999'
  return fa.localeCompare(fb) || PRIORIDAD[a.prioridad] - PRIORIDAD[b.prioridad]
}

function Fila({ t, alAbrir }: { t: Tarea; alAbrir: () => void }) {
  const hoy = hoyISO()
  const hecha = t.estado === 'hecha'
  const vencida = !hecha && t.fechaLimite && t.fechaLimite < hoy
  return (
    <li className="flex items-center gap-3 border-t border-linea py-3">
      <input
        type="checkbox"
        checked={hecha}
        onChange={() => cambiarTarea(t.id, { estado: hecha ? 'pendiente' : 'hecha' })}
        aria-label={`${hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${t.titulo}`}
        className="h-5 w-5 shrink-0 accent-[var(--color-acento)]"
      />
      <button type="button" onClick={alAbrir} className={`flex-1 text-left text-[15px] ${hecha ? 'text-texto-suave line-through' : ''}`}>
        {t.titulo}
        {t.estado === 'en_curso' && <span className="ml-2 rounded-full bg-acento-suave px-2 py-0.5 text-xs font-medium text-acento-fuerte">En curso</span>}
      </button>
      {t.prioridad === 'alta' && !hecha && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900 dark:bg-orange-950 dark:text-orange-200">Alta</span>}
      {t.fechaLimite && (
        <span className={`w-32 text-right text-sm ${vencida ? 'font-semibold text-red-700 dark:text-red-300' : 'text-texto-suave'}`}>{fechaRelativa(t.fechaLimite)}</span>
      )}
    </li>
  )
}

export default function Tareas() {
  const datos = useDatosAgenda()
  const [abierta, setAbierta] = useState<Tarea | 'nueva' | null>(null)
  const [verHechas, setVerHechas] = useState(false)
  const [rapida, setRapida] = useState('')
  const [fechaRapida, setFechaRapida] = useState('')
  if (!datos) return null

  const agregarRapida = async (e: FormEvent) => {
    e.preventDefault()
    if (!rapida.trim()) return
    await guardarTarea({ titulo: rapida.trim(), fechaLimite: fechaRapida || null, prioridad: 'media', estado: 'pendiente' })
    setRapida('')
    setFechaRapida('')
  }
  const hoy = hoyISO()
  const vencidas = datos.tareas.filter((t) => t.estado !== 'hecha' && t.fechaLimite && t.fechaLimite < hoy).length
  const pendientes = datos.tareas.filter((t) => t.estado !== 'hecha').sort(ordenar)
  const hechas = datos.tareas.filter((t) => t.estado === 'hecha').sort((a, b) => b.actualizado.localeCompare(a.actualizado))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[38px] font-semibold tracking-tight">Tareas</h1>
          <p className="text-[15px] text-texto-suave">
            {pendientes.length} pendientes{vencidas > 0 && <span className="font-semibold text-red-700 dark:text-red-300"> · {vencidas} vencidas</span>}
          </p>
        </div>
        <button type="button" className={botonPrincipal} onClick={() => setAbierta('nueva')}>Nueva tarea con detalles</button>
      </header>

      <form onSubmit={agregarRapida} className="flex flex-wrap items-center gap-3 rounded-[20px] bg-superficie p-4">
        <label htmlFor="tarea-rapida" className="sr-only">Nueva tarea</label>
        <input id="tarea-rapida" className={`${campo} min-w-60 flex-1`} placeholder="Escribí una tarea y apretá Enter" value={rapida} onChange={(e) => setRapida(e.target.value)} />
        <label htmlFor="tarea-rapida-fecha" className="sr-only">Fecha límite</label>
        <input id="tarea-rapida-fecha" type="date" className={campo} value={fechaRapida} onChange={(e) => setFechaRapida(e.target.value)} title="Fecha límite (opcional)" />
        <button type="submit" className={botonPrincipal}>Agregar</button>
      </form>

      <section className="rounded-[20px] bg-superficie p-7">
        <h2 className="mb-2 text-lg font-semibold">Pendientes ({pendientes.length})</h2>
        {pendientes.length === 0 ? (
          <p className="border-t border-linea py-4 text-[15px] text-texto-suave">No tenés tareas pendientes.</p>
        ) : (
          <ul>{pendientes.map((t) => <Fila key={t.id} t={t} alAbrir={() => setAbierta(t)} />)}</ul>
        )}
      </section>

      {hechas.length > 0 && (
        <section className="rounded-[20px] bg-superficie p-7">
          <button type="button" onClick={() => setVerHechas(!verHechas)} className="text-lg font-semibold" aria-expanded={verHechas}>
            {verHechas ? '▾' : '▸'} Hechas ({hechas.length})
          </button>
          {verHechas && <ul className="mt-2">{hechas.map((t) => <Fila key={t.id} t={t} alAbrir={() => setAbierta(t)} />)}</ul>}
        </section>
      )}

      {abierta && <FormularioTarea tarea={abierta === 'nueva' ? undefined : abierta} alCerrar={() => setAbierta(null)} />}
    </div>
  )
}
