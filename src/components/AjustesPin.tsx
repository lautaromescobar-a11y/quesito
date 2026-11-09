import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { bloqueo } from '../lib/bloqueo'
import { leerAjuste } from '../lib/db'
import { borrarDiarioYPin, crearPin, quitarPin, verificarPin } from '../lib/diarioDb'
import PadPin from './PadPin'
import Tarjeta from './Tarjeta'
import { botonChico, botonPeligro, botonSecundario, campo } from './ui'

type Paso =
  | { tipo: 'nada' }
  | { tipo: 'nuevo'; tras: 'crear' | 'cambiar' }
  | { tipo: 'repetir'; primero: string }
  | { tipo: 'actual'; para: 'cambiar' | 'quitar' }
  | { tipo: 'olvide' }

/** Crear, cambiar o quitar el PIN del diario. */
export default function AjustesPin() {
  const tiene = useLiveQuery(async () => !!(await leerAjuste('pinDiario', null)))
  const [paso, setPaso] = useState<Paso>({ tipo: 'nada' })
  const [mensaje, setMensaje] = useState('')
  const [confirmacion, setConfirmacion] = useState('')

  const terminar = (m: string) => {
    setPaso({ tipo: 'nada' })
    setMensaje(m)
    setConfirmacion('')
  }

  let contenido
  if (paso.tipo === 'nuevo') {
    contenido = <PadPin titulo="Elegí un PIN" subtitulo="4 números que te acuerdes" alCompletar={(pin) => setPaso({ tipo: 'repetir', primero: pin })} />
  } else if (paso.tipo === 'repetir') {
    contenido = (
      <PadPin
        titulo="Repetí el PIN"
        alCompletar={async (pin) => {
          if (pin !== paso.primero) {
            setPaso({ tipo: 'nuevo', tras: 'crear' })
            return 'No coinciden. Empezá de nuevo.'
          }
          await crearPin(pin)
          bloqueo.desbloquear()
          terminar('PIN guardado. El diario lo va a pedir cada vez que abras la app.')
        }}
      />
    )
  } else if (paso.tipo === 'actual') {
    contenido = (
      <PadPin
        titulo="Ingresá tu PIN actual"
        alCompletar={async (pin) => {
          if (!(await verificarPin(pin))) return 'PIN incorrecto.'
          if (paso.para === 'cambiar') setPaso({ tipo: 'nuevo', tras: 'cambiar' })
          else {
            await quitarPin()
            terminar('Quitaste el PIN. El diario queda abierto.')
          }
        }}
      />
    )
  } else if (paso.tipo === 'olvide') {
    contenido = (
      <div className="space-y-4 py-2">
        <p className="text-[15px]">
          Para que el PIN sirva de algo, no se puede quitar sin saberlo. La única salida es <strong>borrar todas las entradas del diario</strong> junto con el PIN.
          Tus hábitos, rutina, tareas y registros de ánimo no se tocan.
        </p>
        <label htmlFor="confirmar-borrado" className="block text-sm font-medium">Escribí BORRAR para confirmar</label>
        <input id="confirmar-borrado" className={`${campo} w-48`} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
        <div className="flex gap-2">
          <button type="button" className={botonPeligro} disabled={confirmacion.trim().toUpperCase() !== 'BORRAR'} onClick={async () => { await borrarDiarioYPin(); terminar('Se borraron el diario y el PIN.') }}>
            Borrar diario y PIN
          </button>
          <button type="button" className={botonSecundario} onClick={() => terminar('')}>Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <Tarjeta titulo="PIN del diario">
      {paso.tipo === 'nada' ? (
        <>
          <p className="mb-3 text-sm">
            Estado: <strong>{tiene ? 'Activado' : 'Sin PIN'}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {!tiene && <button type="button" className={`${botonChico} border-acento text-acento-fuerte`} onClick={() => { setMensaje(''); setPaso({ tipo: 'nuevo', tras: 'crear' }) }}>Crear PIN</button>}
            {tiene && <button type="button" className={botonChico} onClick={() => { setMensaje(''); setPaso({ tipo: 'actual', para: 'cambiar' }) }}>Cambiar PIN</button>}
            {tiene && <button type="button" className={botonChico} onClick={() => { setMensaje(''); setPaso({ tipo: 'actual', para: 'quitar' }) }}>Quitar PIN</button>}
            {tiene && <button type="button" className={botonChico} onClick={() => { setMensaje(''); setPaso({ tipo: 'olvide' }) }}>Me olvidé el PIN</button>}
          </div>
          {mensaje && <p role="status" className="mt-3 text-sm text-acento-fuerte">{mensaje}</p>}
          <p className="mt-3 text-xs text-texto-suave">
            El PIN evita que alguien abra tu diario al pasar por la compu. No cifra el contenido: es una traba de privacidad, no una caja fuerte.
          </p>
        </>
      ) : (
        <>
          {contenido}
          {paso.tipo !== 'olvide' && (
            <div className="text-center">
              <button type="button" className="text-sm text-texto-suave underline" onClick={() => terminar('')}>Cancelar</button>
            </div>
          )}
        </>
      )}
    </Tarjeta>
  )
}
