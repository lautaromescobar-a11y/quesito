import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { COLORES } from '../lib/colores'
import { deMin } from '../lib/agenda'

export const campo = 'rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-[15px] outline-none focus:border-acento'
export const etiqueta = 'mb-1.5 block text-sm font-medium'
export const ayuda = 'mt-1 text-[13px] text-texto-suave'
export const botonPrincipal = 'min-h-11 rounded-xl bg-acento px-5 text-[15px] font-semibold text-sobre-acento hover:opacity-90'
export const botonSecundario = 'min-h-11 rounded-xl border border-borde px-4 text-[15px] hover:bg-acento-suave'
export const botonChico = 'min-h-9 rounded-lg border border-borde px-3 text-sm hover:bg-acento-suave'
export const botonPeligro = 'min-h-11 rounded-xl border border-red-300 px-4 text-[15px] text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950'

/** Ventana modal con formulario: título, contenido desplazable y pie con botones. */
export function Dialogo({
  titulo,
  alCerrar,
  alEnviar,
  children,
  pie,
}: {
  titulo: string
  alCerrar: () => void
  alEnviar: () => void | Promise<void>
  children: ReactNode
  pie?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    await alEnviar()
  }
  return (
    <dialog ref={ref} onClose={alCerrar} className="m-auto w-[min(560px,calc(100vw-32px))] rounded-[20px] bg-superficie p-0 text-texto backdrop:bg-black/40">
      <form onSubmit={enviar} className="flex max-h-[85vh] flex-col">
        <header className="border-b border-linea px-7 py-5">
          <h2 className="text-xl font-semibold">{titulo}</h2>
        </header>
        <div className="flex flex-col gap-5 overflow-y-auto px-7 py-6">{children}</div>
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-linea px-7 py-4">
          {pie}
          <button type="button" onClick={() => ref.current?.close()} className={botonSecundario}>
            Cancelar
          </button>
          <button type="submit" className={botonPrincipal}>
            Guardar
          </button>
        </footer>
      </form>
    </dialog>
  )
}

export function SelectorColor({ valor, alCambiar }: { valor: string; alCambiar: (hex: string) => void }) {
  return (
    <fieldset>
      <legend className={etiqueta}>Color</legend>
      <div className="flex flex-wrap gap-2">
        {COLORES.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => alCambiar(c.hex)}
            aria-pressed={valor === c.hex}
            aria-label={c.nombre}
            title={c.nombre}
            className={`h-9 w-9 rounded-full border-2 ${valor === c.hex ? 'border-texto' : 'border-transparent'}`}
            style={{ background: c.hex }}
          />
        ))}
      </div>
    </fieldset>
  )
}

/** Horarios cada 15 minutos, de 00:00 a 24:00. */
export const HORAS = Array.from({ length: 97 }, (_, i) => deMin(i * 15))

export function SelectorHora({ id, valor, alCambiar, etiquetaTexto }: { id: string; valor: string; alCambiar: (h: string) => void; etiquetaTexto: string }) {
  return (
    <div>
      <label htmlFor={id} className={etiqueta}>
        {etiquetaTexto}
      </label>
      <select id={id} className={`${campo} w-32`} value={valor} onChange={(e) => alCambiar(e.target.value)}>
        {!HORAS.includes(valor) && <option value={valor}>{valor}</option>}
        {HORAS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Error({ texto }: { texto: string }) {
  if (!texto) return null
  return (
    <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
      {texto}
    </p>
  )
}
