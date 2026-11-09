import { describe, expect, it } from 'vitest'
import { calcularRacha, inicioSemana, textoFrecuencia, type ConfigHabito } from './rachas'

const diaria = (gracia = 2): ConfigHabito => ({ frecuencia: 'diaria', dias: [], vecesPorSemana: 3, diasGracia: gracia })
const lmv: ConfigHabito = { frecuencia: 'dias', dias: [1, 3, 5], vecesPorSemana: 3, diasGracia: 2 }
const tresPorSemana: ConfigHabito = { frecuencia: 'semanal', dias: [], vecesPorSemana: 3, diasGracia: 2 }
const s = (...f: string[]) => new Set(f)

// 2026-11-02 es lunes.
describe('hábito diario', () => {
  it('sin registros la racha es 0', () => {
    expect(calcularRacha(diaria(), s(), '2026-11-05').actual).toBe(0)
  })

  it('cuenta días seguidos y hoy sin marcar no corta', () => {
    const r = calcularRacha(diaria(), s('2026-11-02', '2026-11-03', '2026-11-04'), '2026-11-05')
    expect(r.actual).toBe(3)
    expect(r.graciaUsada).toBe(0)
  })

  it('dos fallas con 2 días de gracia no cortan la racha', () => {
    const r = calcularRacha(diaria(2), s('2026-11-01', '2026-11-02', '2026-11-05'), '2026-11-05')
    expect(r.actual).toBe(3)
  })

  it('tres fallas seguidas con 2 días de gracia cortan la racha', () => {
    const r = calcularRacha(diaria(2), s('2026-11-01', '2026-11-02', '2026-11-06'), '2026-11-06')
    expect(r.actual).toBe(1)
    expect(r.mejor).toBe(2)
  })

  it('informa la gracia gastada cuando hoy todavía no se marcó', () => {
    const r = calcularRacha(diaria(2), s('2026-11-01', '2026-11-02'), '2026-11-04')
    expect(r.actual).toBe(2)
    expect(r.graciaUsada).toBe(1)
  })

  it('con 0 días de gracia una falla corta', () => {
    const r = calcularRacha(diaria(0), s('2026-11-01', '2026-11-03'), '2026-11-03')
    expect(r.actual).toBe(1)
  })

  it('si se agotó la gracia y hoy no se marcó, la racha es 0', () => {
    const r = calcularRacha(diaria(2), s('2026-11-01'), '2026-11-05')
    expect(r.actual).toBe(0)
    expect(r.mejor).toBe(1)
  })
})

describe('días específicos (lunes, miércoles y viernes)', () => {
  it('los días que no tocan no cuentan como falla', () => {
    // lun 2, mié 4, vie 6, lun 9
    const r = calcularRacha(lmv, s('2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'), '2026-11-10')
    expect(r.actual).toBe(4)
  })

  it('faltar dos días programados entra en la gracia; tres la corta', () => {
    expect(calcularRacha(lmv, s('2026-11-02', '2026-11-09'), '2026-11-09').actual).toBe(2)
    expect(calcularRacha(lmv, s('2026-11-02', '2026-11-11'), '2026-11-11').actual).toBe(1)
  })
})

describe('veces por semana', () => {
  it('cuenta semanas que llegan a la meta y la semana en curso no corta', () => {
    const r = calcularRacha(
      tresPorSemana,
      s('2026-11-02', '2026-11-03', '2026-11-05', '2026-11-09', '2026-11-12', '2026-11-14', '2026-11-16'),
      '2026-11-17',
    )
    expect(r.actual).toBe(2)
    expect(r.semanaActual).toBe(1)
  })

  it('una semana pasada que no llegó a la meta corta', () => {
    const r = calcularRacha(tresPorSemana, s('2026-11-02', '2026-11-03', '2026-11-05', '2026-11-10'), '2026-11-17')
    expect(r.actual).toBe(0)
    expect(r.mejor).toBe(1)
  })
})

describe('auxiliares', () => {
  it('la semana empieza el lunes', () => {
    expect(inicioSemana('2026-11-08')).toBe('2026-11-02') // domingo
    expect(inicioSemana('2026-11-02')).toBe('2026-11-02')
  })

  it('describe la frecuencia', () => {
    expect(textoFrecuencia(lmv)).toBe('Lun, Mié y Vie')
    expect(textoFrecuencia(tresPorSemana)).toBe('3 veces por semana')
    expect(textoFrecuencia(diaria())).toBe('Todos los días')
  })
})
