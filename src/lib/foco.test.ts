import { describe, expect, it } from 'vitest'
import { CONFIG_INICIAL, elegirFase, estadoInicial, formatoReloj, iniciar, pausar, reiniciar, restante, siguienteFase, terminarFase } from './focoLogica'


const c = CONFIG_INICIAL

describe('pomodoro', () => {
  it('arranca en foco de 25 minutos detenido', () => {
    const e = estadoInicial(c)
    expect(e.fase).toBe('foco')
    expect(formatoReloj(restante(e, 0))).toBe('25:00')
  })

  it('corre, se pausa conservando lo que falta y se reanuda', () => {
    let e = iniciar(estadoInicial(c), 0)
    expect(restante(e, 60_000)).toBe(24 * 60_000)
    e = pausar(e, 60_000)
    expect(restante(e, 10 * 60_000)).toBe(24 * 60_000)
    e = iniciar(e, 10 * 60_000)
    expect(restante(e, 11 * 60_000)).toBe(23 * 60_000)
  })

  it('después de cada foco viene una pausa corta y la cuarta es larga', () => {
    expect(siguienteFase('foco', 1, c)).toBe('pausa')
    expect(siguienteFase('foco', 4, c)).toBe('pausaLarga')
    expect(siguienteFase('pausa', 1, c)).toBe('foco')
  })

  it('una serie completa: 4 focos, pausa larga y vuelve a empezar', () => {
    let e = estadoInicial(c)
    const fases: string[] = []
    let completos = 0
    for (let i = 0; i < 8; i++) {
      const r = terminarFase(e, c, 0)
      if (r.focoCompleto) completos++
      e = r.estado
      fases.push(e.fase)
    }
    expect(fases).toEqual(['pausa', 'foco', 'pausa', 'foco', 'pausa', 'foco', 'pausaLarga', 'foco'])
    expect(completos).toBe(4)
    expect(e.ciclo).toBe(0)
  })

  it('saltar un foco no lo cuenta como completo', () => {
    const r = terminarFase(estadoInicial(c), c, 0, true)
    expect(r.focoCompleto).toBe(false)
    expect(r.estado.fase).toBe('pausa')
    expect(r.estado.ciclo).toBe(0)
  })

  it('con inicio automático la fase siguiente ya arranca corriendo', () => {
    const r = terminarFase(estadoInicial(c), { ...c, autoSiguiente: true }, 1000)
    expect(r.estado.estado).toBe('corriendo')
    expect(r.estado.finEn).toBe(1000 + 5 * 60_000)
  })

  it('reiniciar y elegir fase vuelven al tiempo completo', () => {
    const corriendo = iniciar(estadoInicial(c), 0)
    expect(restante(reiniciar(corriendo, c), 999_999)).toBe(25 * 60_000)
    expect(restante(elegirFase(corriendo, 'pausaLarga', c), 0)).toBe(15 * 60_000)
  })

  it('formatea el reloj redondeando hacia arriba', () => {
    expect(formatoReloj(59_001)).toBe('01:00')
    expect(formatoReloj(0)).toBe('00:00')
  })
})


import { FRASES, fraseDelDia } from './frases'

describe('frase del día', () => {
  it('hay 25 frases y la del día es la misma todo el día y varía entre días', () => {
    expect(FRASES).toHaveLength(25)
    expect(fraseDelDia('2026-11-06')).toEqual(fraseDelDia('2026-11-06'))
    const distintas = new Set(Array.from({ length: 20 }, (_, i) => fraseDelDia(`2026-11-${String(i + 1).padStart(2, '0')}`).id))
    expect(distintas.size).toBeGreaterThan(5)
  })
})
