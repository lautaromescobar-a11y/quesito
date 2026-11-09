import { useEffect } from 'react'
import { leerAjustesGoogle, sincronizar } from '../lib/google'
import { CAMBIO_EVENTOS } from '../lib/rutinaDb'

const CADA = 15 * 60 * 1000
const AL_VOLVER_MIN = 2 * 60 * 1000

/** Sincroniza con Google sola: al abrir, cada 15 minutos, al volver a la ventana y poco después de cambiar un evento. */
export default function MotorGoogle() {
  useEffect(() => {
    let ultima = 0
    let demora: ReturnType<typeof setTimeout> | undefined
    const correr = async () => {
      if (!(await leerAjustesGoogle()).conectado) return
      ultima = Date.now()
      await sincronizar(false)
    }
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultima > AL_VOLVER_MIN) void correr()
    }
    const alCambiar = () => {
      clearTimeout(demora)
      demora = setTimeout(() => void correr(), 3000)
    }
    void correr()
    const id = setInterval(() => void correr(), CADA)
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener(CAMBIO_EVENTOS, alCambiar)
    return () => {
      clearInterval(id)
      clearTimeout(demora)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener(CAMBIO_EVENTOS, alCambiar)
    }
  }, [])
  return null
}
