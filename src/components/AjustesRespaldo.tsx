import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { leerAjuste } from '../lib/db'
import { contarRespaldo, type Respaldo } from '../lib/estadisticas'
import { fechaRelativa } from '../lib/fechas'
import { descargarRespaldo, leerArchivoRespaldo, restaurarRespaldo } from '../lib/respaldoDb'
import Tarjeta from './Tarjeta'
import { botonChico, botonPeligro, botonPrincipal, botonSecundario } from './ui'

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export default function AjustesRespaldo() {
  const ultimo = useLiveQuery(() => leerAjuste<string | null>('ultimoRespaldo', null))
  const [pendiente, setPendiente] = useState<Respaldo | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const archivo = useRef<HTMLInputElement>(null)

  const elegir = async (f: File | undefined) => {
    setError('')
    setOk('')
    if (!f) return
    const r = await leerArchivoRespaldo(f)
    if (r.error) setError(r.error)
    else setPendiente(r.respaldo!)
    if (archivo.current) archivo.current.value = ''
  }

  const restaurar = async () => {
    if (!pendiente) return
    await restaurarRespaldo(pendiente)
    setPendiente(null)
    setOk('Datos restaurados. Recargando…')
    setTimeout(() => location.reload(), 800)
  }

  const c = pendiente ? contarRespaldo(pendiente) : null

  return (
    <Tarjeta titulo="Respaldo de tus datos">
      <p className="mb-3 text-sm">
        Tus datos viven solo en este navegador. Si se borra el historial del navegador o cambiás de computadora, se pierden. Un respaldo es un archivo con todo, para guardarlo o pasarlo a otra compu.
      </p>
      <p className="mb-4 text-sm text-texto-suave">
        Último respaldo: <strong className="text-texto">{ultimo ? `${fechaRelativa(ultimo.slice(0, 10))} (${ultimo.slice(0, 10)})` : 'nunca'}</strong>
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={botonPrincipal} onClick={() => descargarRespaldo().then(() => setOk('Respaldo descargado. Guardalo en un lugar seguro (por ejemplo, Google Drive).'))}>
          Descargar respaldo
        </button>
        <input ref={archivo} id="importar-respaldo" type="file" accept="application/json,.json" className="sr-only" onChange={(e) => elegir(e.target.files?.[0])} />
        <label htmlFor="importar-respaldo" className={`${botonSecundario} inline-flex cursor-pointer items-center`}>
          Restaurar desde un archivo
        </label>
      </div>

      {pendiente && c && (
        <div role="alertdialog" aria-label="Confirmar restauración" className="mt-4 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p>
            Respaldo del <strong>{pendiente.creado.slice(0, 10)}</strong>: {plural(c.habitos, 'hábito', 'hábitos')}, {plural(c.plantillas, 'plantilla', 'plantillas')}, {plural(c.tareas, 'tarea', 'tareas')}, {plural(c.diario, 'entrada de diario', 'entradas de diario')} y {plural(c.animo, 'registro de ánimo', 'registros de ánimo')}.
          </p>
          <p>
            <strong>Esto reemplaza todo lo que tenés ahora en la app</strong> por lo que hay en el archivo. Si no estás seguro, descargá antes un respaldo de lo actual.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={botonPeligro} onClick={restaurar}>Reemplazar mis datos</button>
            <button type="button" className={botonChico} onClick={() => setPendiente(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>}
      {ok && <p role="status" className="mt-3 text-sm text-acento-fuerte">{ok}</p>}
      <p className="mt-4 text-xs text-texto-suave">La música que subiste para el foco no entra en el respaldo (son archivos grandes): en otra compu la volvés a subir.</p>
    </Tarjeta>
  )
}
