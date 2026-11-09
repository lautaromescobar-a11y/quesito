import { useEffect, useRef, useState } from 'react'

/**
 * Teclado de PIN de 4 números. Se puede usar con el mouse o con el teclado.
 * `alCompletar` recibe el PIN; si devuelve un texto, se muestra como error y se limpia.
 */
export default function PadPin({
  titulo,
  subtitulo,
  alCompletar,
  bloqueadoMs = 0,
}: {
  titulo: string
  subtitulo?: string
  alCompletar: (pin: string) => Promise<string | void> | string | void
  bloqueadoMs?: number
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const bloqueado = bloqueadoMs > 0

  useEffect(() => {
    entrada.current?.focus()
  }, [titulo])

  const cambiar = async (valor: string) => {
    if (bloqueado || ocupado) return
    const limpio = valor.replace(/\D/g, '').slice(0, 4)
    setPin(limpio)
    setError('')
    if (limpio.length === 4) {
      setOcupado(true)
      const r = await alCompletar(limpio)
      setOcupado(false)
      setPin('')
      if (r) setError(r)
      entrada.current?.focus()
    }
  }

  const tecla = 'h-16 w-16 rounded-full bg-superficie text-xl font-semibold shadow-sm hover:bg-acento-suave disabled:opacity-40'

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-5 py-6 text-center" onClick={() => entrada.current?.focus()}>
      <div>
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        {subtitulo && <p className="mt-1 text-[15px] text-texto-suave">{subtitulo}</p>}
      </div>

      <label htmlFor="pin" className="sr-only">PIN de 4 números</label>
      <input
        ref={entrada}
        id="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={pin}
        disabled={bloqueado}
        onChange={(e) => cambiar(e.target.value)}
        className="sr-only"
      />
      <div className="flex gap-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-acento ${i < pin.length ? 'bg-acento' : ''}`} />
        ))}
      </div>

      <p role="alert" className="min-h-5 text-sm font-medium text-red-700 dark:text-red-300">
        {bloqueado ? `Demasiados intentos. Esperá ${Math.ceil(bloqueadoMs / 1000)} segundos.` : error}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button key={n} type="button" className={tecla} disabled={bloqueado} onClick={() => cambiar(pin + n)}>
            {n}
          </button>
        ))}
        <span />
        <button type="button" className={tecla} disabled={bloqueado} onClick={() => cambiar(pin + '0')}>
          0
        </button>
        <button type="button" className={`${tecla} text-base`} disabled={bloqueado || !pin} onClick={() => cambiar(pin.slice(0, -1))} aria-label="Borrar último número">
          ⌫
        </button>
      </div>
    </div>
  )
}
