import { useSyncExternalStore } from 'react'
import { NOMBRE_APP } from './app'

/**
 * Ventanita flotante "siempre encima" con el reloj del foco.
 * Usa Document Picture-in-Picture (Chrome y Edge de escritorio). Tiene que abrirse con un clic.
 */
interface ApiPiP {
  requestWindow(opciones?: { width?: number; height?: number }): Promise<Window>
}

let ventana: Window | null = null
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

function api(): ApiPiP | undefined {
  return (window as unknown as { documentPictureInPicture?: ApiPiP }).documentPictureInPicture
}

/** Copia los estilos de la app a la ventanita para que se vea igual. */
function copiarEstilos(destino: Document) {
  const base = destino.createElement('base')
  base.href = location.origin + import.meta.env.BASE_URL
  destino.head.appendChild(base)
  for (const hoja of [...document.styleSheets]) {
    try {
      const css = [...hoja.cssRules].map((r) => r.cssText).join('\n')
      const estilo = destino.createElement('style')
      estilo.textContent = css
      destino.head.appendChild(estilo)
    } catch {
      if (hoja.href) {
        const link = destino.createElement('link')
        link.rel = 'stylesheet'
        link.href = hoja.href
        destino.head.appendChild(link)
      }
    }
  }
  destino.documentElement.className = document.documentElement.className
}

export const ventanita = {
  soportada: () => !!api(),
  abierta: () => ventana,
  suscribir(f: () => void) {
    oyentes.add(f)
    return () => oyentes.delete(f)
  },
  async abrir(): Promise<boolean> {
    const pip = api()
    if (!pip) return false
    if (ventana) return true
    try {
      const w = await pip.requestWindow({ width: 340, height: 230 })
      copiarEstilos(w.document)
      w.document.title = `Foco · ${NOMBRE_APP}`
      w.document.body.className = 'm-0 bg-fondo text-texto'
      w.addEventListener('pagehide', () => {
        ventana = null
        avisar()
      })
      ventana = w
      avisar()
      return true
    } catch {
      return false
    }
  },
  cerrar() {
    ventana?.close()
    ventana = null
    avisar()
  },
}

export function useVentanita(): Window | null {
  return useSyncExternalStore(ventanita.suscribir, ventanita.abierta)
}
