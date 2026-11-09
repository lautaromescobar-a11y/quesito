import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { guardarAjuste, leerAjuste } from '../lib/db'
import { foco, useFoco } from '../lib/foco'
import { formatoReloj, NOMBRE_FASE, restante } from '../lib/focoLogica'
import { useVentanita, ventanita } from '../lib/ventanita'
import Ratoncito from './Ratoncito'
import { botonChico } from './ui'

function Contenido() {
  const { estado } = useFoco()
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 500)
    return () => clearInterval(id)
  }, [])
  const modo = estado.estado === 'corriendo' ? (estado.fase === 'foco' ? 'estudia' : 'descansa') : 'espera'
  const boton = 'min-h-9 rounded-lg px-3 text-sm font-semibold'

  return (
    <div className="flex h-screen items-center gap-3 p-3 font-sans">
      <Ratoncito modo={modo} tamano={120} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-xs font-medium text-texto-suave">{estado.estado === 'pausado' ? 'En pausa' : NOMBRE_FASE[estado.fase]}</span>
        <span className="text-4xl font-semibold leading-none tabular-nums">{formatoReloj(restante(estado, ahora))}</span>
        {estado.vinculo.titulo && <span className="truncate text-sm" title={estado.vinculo.titulo}>{estado.vinculo.titulo}</span>}
        <div className="mt-1 flex gap-1.5">
          {estado.estado === 'corriendo' ? (
            <button type="button" className={`${boton} bg-acento text-sobre-acento`} onClick={foco.pausar}>Pausar</button>
          ) : (
            <button type="button" className={`${boton} bg-acento text-sobre-acento`} onClick={foco.iniciar}>{estado.estado === 'pausado' ? 'Seguir' : 'Empezar'}</button>
          )}
          <button type="button" className={`${boton} border border-borde bg-superficie`} onClick={foco.saltar}>Saltar</button>
        </div>
      </div>
    </div>
  )
}

/** Dibuja el contenido dentro de la ventanita flotante cuando está abierta. */
export default function VentanitaFoco() {
  const ventana = useVentanita()
  if (!ventana) return null
  return createPortal(<Contenido />, ventana.document.body)
}

export function useAbrirSola(): boolean {
  return useLiveQuery(() => leerAjuste('ventanitaAuto', false)) ?? false
}

/** Botones de la pantalla Foco para abrir la ventanita y elegir si se abre sola. */
export function VentanitaControles() {
  const abierta = useVentanita()
  const guardado = useAbrirSola()
  const [local, setLocal] = useState<boolean | null>(null)
  const abrirSola = local ?? guardado
  const [error, setError] = useState('')

  if (!ventanita.soportada()) {
    return (
      <p className="mt-4 rounded-xl bg-fondo px-4 py-3 text-sm text-texto-suave">
        La ventanita flotante (reloj encima de otras ventanas) funciona en Chrome o Edge para computadora. Este navegador no la permite.
      </p>
    )
  }

  return (
    <div className="mt-5 space-y-3 rounded-xl bg-fondo px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={botonChico}
          onClick={async () => {
            if (abierta) ventanita.cerrar()
            else if (!(await ventanita.abrir())) setError('No se pudo abrir. Probá de nuevo con un clic.')
          }}
        >
          {abierta ? 'Cerrar ventanita flotante' : 'Abrir ventanita flotante'}
        </button>
        <span className="text-sm text-texto-suave">Un mini reloj que queda encima de tus otras ventanas.</span>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-acento)]" checked={abrirSola}
          onChange={(e) => {
            setLocal(e.target.checked)
            void guardarAjuste('ventanitaAuto', e.target.checked)
          }} />
        Abrirla sola al tocar Empezar
      </label>
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  )
}
