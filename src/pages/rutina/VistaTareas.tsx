import { useState } from 'react'
import FormularioTarea from '../../components/FormularioTarea'
import { botonPrincipal } from '../../components/ui'
import type { Tarea } from '../../lib/db'
import { fechaRelativa, hoyISO } from '../../lib/fechas'
import { cambiarTarea } from '../../lib/rutinaDb'
import type { DatosAgenda } from '../../lib/useAgenda'

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

export default function VistaTareas({ datos }: { datos: DatosAgenda }) {
  const [abierta, setAbierta] = useState<Tarea | 'nueva' | null>(null)
  const [verHechas, setVerHechas] = useState(false)
  const pendientes = datos.tareas.filter((t) => t.estado !== 'hecha').sort(ordenar)
  const hechas = datos.tareas.filter((t) => t.estado === 'hecha').sort((a, b) => b.actualizado.localeCompare(a.actualizado))

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button type="button" className={botonPrincipal} onClick={() => setAbierta('nueva')}>Nueva tarea</button>
      </div>

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
