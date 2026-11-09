import { useEffect } from 'react'
import { iniciarMotorFoco, useFoco } from '../lib/foco'
import { ambiente } from '../lib/sonidos'
import { useMusica, usePrefSonido } from '../lib/usePrefs'

/** Sin interfaz: mantiene el reloj de foco andando y prende o apaga el sonido según la fase. */
export default function MotorFoco() {
  const { estado } = useFoco()
  const pref = usePrefSonido()
  const musica = useMusica()

  useEffect(() => iniciarMotorFoco(), [])

  const suena = !!pref && pref.tipo !== 'silencio' && estado.estado === 'corriendo' && (estado.fase === 'foco' || pref.enPausas)
  const blob = pref?.tipo.startsWith('musica:') ? musica?.find((m) => `musica:${m.id}` === pref.tipo)?.blob : undefined

  useEffect(() => {
    if (!pref) return
    if (suena) ambiente.reproducir(pref.tipo, pref.volumen, blob)
    else ambiente.detener()
  }, [suena, pref?.tipo, blob]) // eslint-disable-line react-hooks/exhaustive-deps

  // El volumen se aplica a lo que esté sonando, también al probar un sonido.
  useEffect(() => {
    if (pref && ambiente.actual() !== 'silencio') ambiente.volumen(pref.volumen)
  }, [pref?.volumen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => ambiente.detener(), [])
  return null
}
