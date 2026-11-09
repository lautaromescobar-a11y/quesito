import { useEffect, useRef, useState, type FormEvent } from 'react'
import { guardarHabito, habitoVacio, type DiaSemana, type Habito } from '../lib/db'

type Datos = typeof habitoVacio

const DIAS: { valor: DiaSemana; corto: string; largo: string }[] = [
  { valor: 1, corto: 'L', largo: 'Lunes' },
  { valor: 2, corto: 'M', largo: 'Martes' },
  { valor: 3, corto: 'M', largo: 'Miércoles' },
  { valor: 4, corto: 'J', largo: 'Jueves' },
  { valor: 5, corto: 'V', largo: 'Viernes' },
  { valor: 6, corto: 'S', largo: 'Sábado' },
  { valor: 0, corto: 'D', largo: 'Domingo' },
]

const campo = 'rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-[15px] outline-none focus:border-acento'
const etiqueta = 'mb-1.5 block text-sm font-medium'
const ayuda = 'mt-1 text-[13px] text-texto-suave'

export default function FormularioHabito({ habito, alCerrar }: { habito?: Habito; alCerrar: () => void }) {
  const [d, setD] = useState<Datos>(() => {
    if (!habito) return { ...habitoVacio }
    const { id: _i, actualizado: _a, borrado: _b, ...resto } = habito
    return resto
  })
  const [error, setError] = useState('')
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogo.current?.showModal()
  }, [])

  const set = <K extends keyof Datos>(k: K, v: Datos[K]) => setD((x) => ({ ...x, [k]: v }))

  const alternarDia = (dia: DiaSemana) =>
    set('dias', d.dias.includes(dia) ? d.dias.filter((x) => x !== dia) : [...d.dias, dia])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.nombre.trim()) return setError('Poné un nombre al hábito.')
    if (d.frecuencia === 'dias' && d.dias.length === 0) return setError('Elegí al menos un día.')
    await guardarHabito(
      { ...d, nombre: d.nombre.trim(), disparador: d.disparador.trim(), meta: d.meta.trim(), versionMinima: d.versionMinima.trim() },
      habito?.id,
    )
    alCerrar()
  }

  return (
    <dialog
      ref={dialogo}
      onClose={alCerrar}
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-[20px] bg-superficie p-0 text-texto backdrop:bg-black/40"
    >
      <form onSubmit={enviar} className="flex max-h-[85vh] flex-col">
        <header className="border-b border-linea px-7 py-5">
          <h2 className="text-xl font-semibold">{habito ? 'Editar hábito' : 'Nuevo hábito'}</h2>
        </header>

        <div className="flex flex-col gap-5 overflow-y-auto px-7 py-6">
          <div>
            <label htmlFor="nombre" className={etiqueta}>Nombre</label>
            <input id="nombre" className={`${campo} w-full`} value={d.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej.: Lectura" autoFocus />
          </div>

          <div>
            <label htmlFor="disparador" className={etiqueta}>¿Cuándo lo hacés?</label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[15px] text-texto-suave">Después de</span>
              <input id="disparador" className={`${campo} w-full`} value={d.disparador} onChange={(e) => set('disparador', e.target.value)} placeholder="desayunar, clases, cenar…" />
            </div>
            <p className={ayuda}>Atarlo a algo que ya hacés todos los días ayuda a no olvidarlo.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="meta" className={etiqueta}>Meta</label>
              <input id="meta" className={`${campo} w-full`} value={d.meta} onChange={(e) => set('meta', e.target.value)} placeholder="Ej.: 1 hora" />
            </div>
            <div>
              <label htmlFor="minima" className={etiqueta}>Versión mínima <span className="font-normal text-texto-suave">(opcional)</span></label>
              <input id="minima" className={`${campo} w-full`} value={d.versionMinima} onChange={(e) => set('versionMinima', e.target.value)} placeholder="Ej.: 15 minutos" />
            </div>
          </div>
          <p className={`${ayuda} -mt-3`}>La versión mínima es lo que cuenta como cumplido en un mal día y mantiene la racha.</p>

          <fieldset>
            <legend className={etiqueta}>Frecuencia</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['diaria', 'Todos los días'],
                  ['dias', 'Días específicos'],
                  ['semanal', 'Veces por semana'],
                ] as const
              ).map(([valor, texto]) => (
                <label key={valor} className={`flex min-h-11 cursor-pointer items-center rounded-xl border px-4 text-[15px] ${d.frecuencia === valor ? 'border-acento bg-acento-suave font-medium text-acento-fuerte' : 'border-borde'}`}>
                  <input type="radio" name="frecuencia" value={valor} checked={d.frecuencia === valor} onChange={() => set('frecuencia', valor)} className="sr-only" />
                  {texto}
                </label>
              ))}
            </div>

            {d.frecuencia === 'dias' && (
              <div className="mt-3 flex gap-1.5">
                {DIAS.map((dia) => {
                  const activo = d.dias.includes(dia.valor)
                  return (
                    <button
                      key={dia.valor}
                      type="button"
                      onClick={() => alternarDia(dia.valor)}
                      aria-pressed={activo}
                      aria-label={dia.largo}
                      className={`h-11 w-11 rounded-full border text-sm font-semibold ${activo ? 'border-acento bg-acento text-sobre-acento' : 'border-borde text-texto-suave'}`}
                    >
                      {dia.corto}
                    </button>
                  )
                })}
              </div>
            )}

            {d.frecuencia === 'semanal' && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  id="veces"
                  type="number"
                  min={1}
                  max={7}
                  className={`${campo} w-24`}
                  value={d.vecesPorSemana}
                  onChange={(e) => set('vecesPorSemana', Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
                />
                <label htmlFor="veces" className="text-[15px]">veces por semana, cualquier día</label>
              </div>
            )}
          </fieldset>

          {d.frecuencia !== 'semanal' ? (
            <div>
              <label htmlFor="gracia" className={etiqueta}>Días de gracia</label>
              <input
                id="gracia"
                type="number"
                min={0}
                max={7}
                className={`${campo} w-24`}
                value={d.diasGracia}
                onChange={(e) => set('diasGracia', Math.min(7, Math.max(0, Number(e.target.value) || 0)))}
              />
              <p className={ayuda}>Cuántos días que tocaba podés fallar seguidos sin que se corte la racha.</p>
            </div>
          ) : (
            <p className={ayuda}>En "veces por semana" la racha cuenta semanas seguidas en las que llegaste a la meta.</p>
          )}

          <div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--color-acento)]"
                checked={d.horaRecordatorio !== null}
                onChange={(e) => set('horaRecordatorio', e.target.checked ? '09:00' : null)}
              />
              Recordarme a una hora
            </label>
            {d.horaRecordatorio !== null && (
              <input type="time" aria-label="Hora del recordatorio" className={`${campo} mt-2 w-36`} value={d.horaRecordatorio} onChange={(e) => set('horaRecordatorio', e.target.value || '09:00')} />
            )}
          </div>

          {error && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-linea px-7 py-4">
          <button type="button" onClick={() => dialogo.current?.close()} className="min-h-11 rounded-xl border border-borde px-5 text-[15px] hover:bg-acento-suave">
            Cancelar
          </button>
          <button type="submit" className="min-h-11 rounded-xl bg-acento px-5 text-[15px] font-semibold text-sobre-acento hover:opacity-90">
            Guardar
          </button>
        </footer>
      </form>
    </dialog>
  )
}
