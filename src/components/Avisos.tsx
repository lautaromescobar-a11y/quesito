import { cerrarAviso, useAvisos } from '../lib/avisos'

export default function Avisos() {
  const avisos = useAvisos()
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-6 bottom-6 z-50 flex w-[min(380px,calc(100vw-48px))] flex-col gap-2">
      {avisos.map((a) => (
        <div key={a.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3 shadow-lg">
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">{a.texto}</span>
            {a.detalle && <span className="mt-0.5 block text-sm text-texto-suave">{a.detalle}</span>}
          </span>
          <button type="button" onClick={() => cerrarAviso(a.id)} aria-label="Cerrar aviso" className="-mr-1 h-7 w-7 rounded-full text-texto-suave hover:bg-acento-suave">×</button>
        </div>
      ))}
    </div>
  )
}
