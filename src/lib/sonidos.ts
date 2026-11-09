/**
 * Sonidos ambientales generados con Web Audio: no usan archivos, funcionan sin internet
 * y no tienen derechos de autor. También se puede reproducir música propia subida por el usuario.
 */

export type TipoSonido = 'silencio' | 'lluvia' | 'olas' | 'marron' | 'viento' | 'fogata' | `musica:${string}`

export const SONIDOS_GENERADOS: { tipo: TipoSonido; nombre: string; detalle: string }[] = [
  { tipo: 'lluvia', nombre: 'Lluvia', detalle: 'Lluvia suave con gotas' },
  { tipo: 'olas', nombre: 'Olas', detalle: 'Mar que va y viene' },
  { tipo: 'marron', nombre: 'Ruido marrón', detalle: 'Grave y parejo, tapa ruidos' },
  { tipo: 'viento', nombre: 'Viento', detalle: 'Ráfagas lentas' },
  { tipo: 'fogata', nombre: 'Fogata', detalle: 'Fuego que crepita' },
]

let ctx: AudioContext | null = null
let general: GainNode | null = null
let fuentes: AudioScheduledSourceNode[] = []
let temporizadores: number[] = []
let audio: HTMLAudioElement | null = null
let urlAudio: string | null = null
let actual: TipoSonido = 'silencio'
let volumenActual = 0.5

/** El oído percibe el volumen de forma no lineal: con el cuadrado el control se siente parejo. */
const curva = (v: number) => Math.min(1, Math.max(0, v)) ** 2

function contexto(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    general = ctx.createGain()
    general.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function bufferRuido(c: AudioContext, color: 'blanco' | 'rosa' | 'marron', segundos = 6): AudioBuffer {
  const n = c.sampleRate * segundos
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, ultimo = 0
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1
    if (color === 'blanco') d[i] = w * 0.5
    else if (color === 'rosa') {
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11
    } else {
      ultimo = (ultimo + 0.02 * w) / 1.02
      d[i] = ultimo * 3.5
    }
  }
  return buf
}

function fuenteRuido(c: AudioContext, color: 'blanco' | 'rosa' | 'marron'): AudioBufferSourceNode {
  const s = c.createBufferSource()
  s.buffer = bufferRuido(c, color)
  s.loop = true
  s.start()
  fuentes.push(s)
  return s
}

function filtro(c: AudioContext, tipo: BiquadFilterType, frecuencia: number, q = 0.7): BiquadFilterNode {
  const f = c.createBiquadFilter()
  f.type = tipo
  f.frequency.value = frecuencia
  f.Q.value = q
  return f
}

function ganancia(c: AudioContext, valor: number): GainNode {
  const g = c.createGain()
  g.gain.value = valor
  return g
}

/** Oscilador lento que mueve un parámetro alrededor de su valor. */
function lfo(c: AudioContext, frecuencia: number, profundidad: number, destino: AudioParam) {
  const o = c.createOscillator()
  o.frequency.value = frecuencia
  const g = ganancia(c, profundidad)
  o.connect(g).connect(destino)
  o.start()
  fuentes.push(o)
}

/** Golpes cortos y al azar (gotas, chasquidos) sobre una cadena de ruido. */
function chasquidos(c: AudioContext, salida: AudioNode, opciones: { color: 'blanco' | 'rosa'; frecuencia: number; cadaMs: [number, number]; fuerza: [number, number]; duracion: number }) {
  const g = ganancia(c, 0)
  fuenteRuido(c, opciones.color).connect(filtro(c, 'bandpass', opciones.frecuencia, 1.2)).connect(g).connect(salida)
  const programar = () => {
    const t = c.currentTime
    const fuerza = opciones.fuerza[0] + Math.random() * (opciones.fuerza[1] - opciones.fuerza[0])
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(fuerza, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + opciones.duracion)
    const espera = opciones.cadaMs[0] + Math.random() * (opciones.cadaMs[1] - opciones.cadaMs[0])
    temporizadores.push(window.setTimeout(programar, espera))
  }
  programar()
}

function armar(tipo: TipoSonido, c: AudioContext, salida: AudioNode) {
  switch (tipo) {
    case 'lluvia': {
      fuenteRuido(c, 'rosa').connect(filtro(c, 'highpass', 400)).connect(filtro(c, 'lowpass', 6500)).connect(ganancia(c, 0.7)).connect(salida)
      chasquidos(c, salida, { color: 'blanco', frecuencia: 3200, cadaMs: [25, 140], fuerza: [0.05, 0.25], duracion: 0.035 })
      break
    }
    case 'olas': {
      const g = ganancia(c, 0.55)
      fuenteRuido(c, 'marron').connect(filtro(c, 'lowpass', 1100)).connect(g).connect(salida)
      lfo(c, 0.09, 0.4, g.gain)
      break
    }
    case 'marron':
      fuenteRuido(c, 'marron').connect(filtro(c, 'lowpass', 650)).connect(ganancia(c, 0.9)).connect(salida)
      break
    case 'viento': {
      const f = filtro(c, 'bandpass', 600, 0.9)
      const g = ganancia(c, 0.6)
      fuenteRuido(c, 'blanco').connect(f).connect(g).connect(salida)
      lfo(c, 0.06, 350, f.frequency)
      lfo(c, 0.11, 0.3, g.gain)
      break
    }
    case 'fogata':
      fuenteRuido(c, 'marron').connect(filtro(c, 'lowpass', 320)).connect(ganancia(c, 0.6)).connect(salida)
      chasquidos(c, salida, { color: 'blanco', frecuencia: 2200, cadaMs: [40, 420], fuerza: [0.1, 0.6], duracion: 0.02 })
      break
  }
}

export const ambiente = {
  actual: () => actual,
  /** Reproduce un sonido (o música propia con `blob`). Si ya suena el mismo, solo ajusta el volumen. */
  reproducir(tipo: TipoSonido, volumen: number, blob?: Blob) {
    if (tipo === 'silencio') return ambiente.detener()
    if (tipo === actual) return ambiente.volumen(volumen)
    ambiente.detener()
    actual = tipo
    if (tipo.startsWith('musica:')) {
      if (!blob) return
      urlAudio = URL.createObjectURL(blob)
      audio = new Audio(urlAudio)
      audio.loop = true
      audio.volume = curva(volumen)
      void audio.play().catch(() => {
        /* el navegador puede pedir un clic antes de reproducir */
      })
      return
    }
    const c = contexto()
    volumenActual = volumen
    general!.gain.cancelScheduledValues(c.currentTime)
    general!.gain.setValueAtTime(curva(volumen) * 1.4, c.currentTime)
    armar(tipo, c, general!)
  },
  volumen(v: number) {
    volumenActual = v
    if (general && ctx) {
      general.gain.cancelScheduledValues(ctx.currentTime)
      general.gain.setTargetAtTime(curva(v) * 1.4, ctx.currentTime, 0.05)
    }
    if (audio) audio.volume = curva(v)
  },
  volumenActual: () => volumenActual,
  detener() {
    fuentes.forEach((f) => {
      try {
        f.stop()
      } catch {
        /* ya estaba detenido */
      }
    })
    fuentes = []
    temporizadores.forEach((t) => window.clearTimeout(t))
    temporizadores = []
    if (audio) {
      audio.pause()
      audio = null
    }
    if (urlAudio) {
      URL.revokeObjectURL(urlAudio)
      urlAudio = null
    }
    actual = 'silencio'
  },
}

/**
 * Aviso de fin: dos toques de campana, fuertes y claros (fundamental + armónicos),
 * pasados por un compresor para que se escuchen bien sin saturar.
 */
export function sonarCampana() {
  try {
    const c = contexto()
    const compresor = c.createDynamicsCompressor()
    compresor.threshold.value = -12
    compresor.ratio.value = 4
    const salida = c.createGain()
    salida.gain.value = 0.9
    compresor.connect(salida).connect(c.destination)
    const t0 = c.currentTime + 0.05
    const toque = (inicio: number, base: number) => {
      for (const [mult, nivel] of [[1, 0.6], [2.01, 0.25], [3.02, 0.12], [4.2, 0.06]] as const) {
        const o = c.createOscillator()
        o.type = 'sine'
        o.frequency.value = base * mult
        const g = c.createGain()
        g.gain.setValueAtTime(0.0001, inicio)
        g.gain.exponentialRampToValueAtTime(nivel, inicio + 0.008)
        g.gain.exponentialRampToValueAtTime(0.0001, inicio + 1.8 / mult + 0.4)
        o.connect(g).connect(compresor)
        o.start(inicio)
        o.stop(inicio + 2.4)
      }
    }
    toque(t0, 880)
    toque(t0 + 0.45, 1174.66)
    toque(t0 + 1.2, 880)
  } catch {
    /* sin audio disponible */
  }
}
