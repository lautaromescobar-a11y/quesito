import { useState, type FormEvent } from 'react'
import { botonPrincipal, campo } from '../components/ui'
import { NOMBRE_APP } from '../lib/app'
import { recurso } from '../lib/ruta'
import { terminarBienvenida } from '../lib/ejemplos'
import { estadoPermiso, pedirPermiso } from '../lib/notificaciones'

/** Primera pantalla para alguien que instala la app por primera vez. */
export default function Bienvenida() {
  const [nombre, setNombre] = useState('')
  const [ejemplos, setEjemplos] = useState(true)
  const [permiso, setPermiso] = useState(estadoPermiso())
  const [enviando, setEnviando] = useState(false)

  const empezar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    await terminarBienvenida(nombre, ejemplos)
  }

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <form onSubmit={empezar} className="w-full max-w-lg space-y-7 rounded-[24px] bg-superficie p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={recurso('favicon.svg')} alt="" width="56" height="56" className="rounded-2xl" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Te damos la bienvenida a {NOMBRE_APP}</h1>
            <p className="text-[15px] text-texto-suave">Tu rutina, tus hábitos y tu diario en un solo lugar.</p>
          </div>
        </div>

        <div>
          <label htmlFor="bv-nombre" className="mb-1.5 block text-sm font-medium">¿Cómo querés que te llame?</label>
          <input id="bv-nombre" className={`${campo} w-full`} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre o apodo" autoFocus />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">¿Cómo querés empezar?</legend>
          <div className="flex flex-col gap-2">
            {(
              [
                [true, 'Con ejemplos', 'Dos hábitos, una semana tipo y una tarea de muestra para ver cómo funciona. Después los editás o borrás.'],
                [false, 'Desde cero', 'La app arranca vacía y cargás todo a tu manera.'],
              ] as const
            ).map(([valor, titulo, detalle]) => (
              <label key={titulo} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${ejemplos === valor ? 'border-acento bg-acento-suave' : 'border-borde'}`}>
                <input type="radio" name="inicio" className="mt-1 accent-[var(--color-acento)]" checked={ejemplos === valor} onChange={() => setEjemplos(valor)} />
                <span>
                  <span className="block text-[15px] font-medium">{titulo}</span>
                  <span className="block text-[13px] text-texto-suave">{detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {permiso !== 'granted' && permiso !== 'no-soportado' && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-fondo px-4 py-3 text-sm">
            <span className="flex-1">¿Querés recordatorios de tus hábitos y aviso cuando termina un foco?</span>
            <button type="button" className="min-h-9 rounded-lg border border-borde px-3 hover:bg-acento-suave" onClick={async () => setPermiso(await pedirPermiso())}>
              Permitir notificaciones
            </button>
          </div>
        )}

        <p className="text-[13px] text-texto-suave">Todo se guarda en esta computadora. Nadie más ve tus datos.</p>

        <button type="submit" className={`${botonPrincipal} w-full`} disabled={enviando}>
          Empezar
        </button>
      </form>
    </main>
  )
}
