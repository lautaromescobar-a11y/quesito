import { useEffect, useState } from 'react'
import { guardarAjuste } from '../lib/db'
import { useNombre } from '../lib/perfil'
import Tarjeta from './Tarjeta'
import { botonChico, campo } from './ui'

export default function AjustesNombre() {
  const nombre = useNombre()
  const [valor, setValor] = useState('')
  const [listo, setListo] = useState(false)
  useEffect(() => setValor(nombre ?? ''), [nombre])
  return (
    <Tarjeta titulo="Tu nombre">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          await guardarAjuste('nombre', valor.trim())
          setListo(true)
        }}
      >
        <label htmlFor="ajuste-nombre" className="sr-only">Nombre</label>
        <input id="ajuste-nombre" className={`${campo} w-64`} value={valor} onChange={(e) => { setValor(e.target.value); setListo(false) }} placeholder="Cómo querés que te llame" />
        <button type="submit" className={botonChico}>Guardar</button>
        {listo && <span role="status" className="text-sm text-acento-fuerte">Guardado</span>}
      </form>
    </Tarjeta>
  )
}
