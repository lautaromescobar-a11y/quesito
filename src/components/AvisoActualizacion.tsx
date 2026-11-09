import { useRegisterSW } from 'virtual:pwa-register/react'
import { NOMBRE_APP } from '../lib/app'

const CADA_HORA = 60 * 60 * 1000

/**
 * Cuando hay una versión nueva publicada, muestra un aviso para actualizar.
 * No se actualiza sola para no cortar algo que estés escribiendo.
 */
export default function AvisoActualizacion() {
  const {
    needRefresh: [hayNueva, setHayNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      // Revisa si hay versión nueva cada hora mientras la app está abierta.
      if (registro) setInterval(() => void registro.update(), CADA_HORA)
    },
  })

  if (!hayNueva) return null
  return (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 flex w-[min(520px,calc(100vw-32px))] -translate-x-1/2 flex-wrap items-center gap-3 rounded-2xl border border-acento bg-superficie px-5 py-3 shadow-lg">
      <span className="flex-1 text-[15px]">
        <strong>Hay una versión nueva de {NOMBRE_APP}.</strong>
        <span className="block text-sm text-texto-suave">Tus datos no se tocan.</span>
      </span>
      <button type="button" className="min-h-10 rounded-xl bg-acento px-4 text-[15px] font-semibold text-sobre-acento" onClick={() => updateServiceWorker(true)}>
        Actualizar
      </button>
      <button type="button" className="min-h-10 rounded-xl px-3 text-sm text-texto-suave" onClick={() => setHayNueva(false)}>
        Después
      </button>
    </div>
  )
}
