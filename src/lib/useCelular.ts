import { useSyncExternalStore } from 'react'

/** true en pantallas chicas (celular). Coincide con el corte `md` de Tailwind (768 px). */
const consulta = '(max-width: 767px)'

export function useCelular(): boolean {
  return useSyncExternalStore(
    (f) => {
      const m = window.matchMedia(consulta)
      m.addEventListener('change', f)
      return () => m.removeEventListener('change', f)
    },
    () => window.matchMedia(consulta).matches,
  )
}
