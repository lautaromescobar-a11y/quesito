import { describe, expect, it } from 'vitest'
import type { CheckinAnimo, Habito, RegistroHabito, SesionFoco, Tarea } from './db'
import { habitoVacio } from './db'
import { animoSegunHabitos, contarRespaldo, cumplimiento, FORMATO_RESPALDO, resumenSemana, ultimasSemanas, validarRespaldo } from './estadisticas'

const base = { actualizado: '2026-11-01T00:00:00Z', borrado: false }
const habito = (id: string, extra: Partial<Habito> = {}): Habito => ({ ...base, ...habitoVacio, id, nombre: id, ...extra })
const reg = (habitoId: string, fecha: string, estado: RegistroHabito['estado'] = 'completo'): RegistroHabito => ({ ...base, id: `${habitoId}${fecha}`, habitoId, fecha, estado, nota: '' })
const animo = (fecha: string, a: CheckinAnimo['animo']): CheckinAnimo => ({ ...base, id: fecha, fecha, animo: a, energia: 3, nota: '' })

// 2026-11-02 es lunes.
describe('cumplimiento', () => {
  it('diario: cuenta desde el primer registro y el mínimo vale', () => {
    const h = habito('leer')
    const rs = [reg('leer', '2026-11-03'), reg('leer', '2026-11-04', 'minimo'), reg('leer', '2026-11-06', 'omitido')]
    expect(cumplimiento(h, rs, '2026-11-02', '2026-11-08')).toEqual({ hechos: 2, esperados: 6, porcentaje: 33 })
  })

  it('días específicos: solo cuenta lunes, miércoles y viernes', () => {
    const h = habito('gym', { frecuencia: 'dias', dias: [1, 3, 5] })
    const rs = [reg('gym', '2026-11-02'), reg('gym', '2026-11-04')]
    expect(cumplimiento(h, rs, '2026-11-02', '2026-11-08')).toEqual({ hechos: 2, esperados: 3, porcentaje: 67 })
  })

  it('semanal: topea en la meta de cada semana', () => {
    const h = habito('meditar', { frecuencia: 'semanal', vecesPorSemana: 2 })
    const rs = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10'].map((f) => reg('meditar', f))
    expect(cumplimiento(h, rs, '2026-11-02', '2026-11-15')).toEqual({ hechos: 3, esperados: 4, porcentaje: 75 })
  })

  it('sin registros no hay porcentaje', () => {
    expect(cumplimiento(habito('x'), [], '2026-11-02', '2026-11-08').porcentaje).toBeNull()
  })
})

describe('resumen de la semana', () => {
  it('junta hábitos, ánimo, foco, tareas y diario de lunes a domingo', () => {
    const foco = (fecha: string, minutos: number): SesionFoco => ({ ...base, id: fecha + minutos, fecha, hora: '10:00', titulo: '', minutos, tareaId: null, bloqueId: null })
    const tarea = (id: string, actualizado: string, estado: Tarea['estado']): Tarea => ({ ...base, actualizado, id, titulo: id, fechaLimite: null, estado, prioridad: 'media', categoriaId: null })
    const r = resumenSemana(
      {
        habitos: [habito('leer')],
        registros: [reg('leer', '2026-11-02'), reg('leer', '2026-11-03')],
        animo: [animo('2026-11-02', 4), animo('2026-11-05', 3), animo('2026-11-10', 1)],
        foco: [foco('2026-11-04', 25), foco('2026-11-04', 25), foco('2026-11-09', 25)],
        tareas: [tarea('a', '2026-11-05T12:00:00Z', 'hecha'), tarea('b', '2026-11-05T12:00:00Z', 'pendiente'), tarea('c', '2026-10-30T12:00:00Z', 'hecha')],
        diario: [{ ...base, id: 'd', fecha: '2026-11-06', titulo: '', texto: 'x', etiquetas: [] }],
      },
      '2026-11-06',
    )
    expect(r.lunes).toBe('2026-11-02')
    expect(r.total).toEqual({ hechos: 2, esperados: 7, porcentaje: 29 })
    expect([r.animo, r.diasAnimo, r.minutosFoco, r.sesionesFoco, r.tareasHechas, r.entradasDiario]).toEqual([3.5, 2, 50, 2, 1, 1])
  })

  it('últimas semanas termina en el lunes actual', () => {
    expect(ultimasSemanas('2026-11-06', 3)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02'])
  })
})

describe('patrón ánimo / hábitos', () => {
  it('compara el ánimo de los días con todos los hábitos hechos contra el resto', () => {
    const hs = [habito('a'), habito('b', { frecuencia: 'dias', dias: [1] })]
    const rs = [reg('a', '2026-11-02'), reg('b', '2026-11-02'), reg('a', '2026-11-03'), reg('a', '2026-11-09')]
    const as = [animo('2026-11-02', 5), animo('2026-11-03', 4), animo('2026-11-04', 2), animo('2026-11-09', 3)]
    expect(animoSegunHabitos(hs, rs, as, '2026-11-01', '2026-11-30')).toEqual({ conTodos: 4.5, sinTodos: 2.5, dias: 4 })
  })
})

describe('respaldo', () => {
  const tablas = ['habitos', 'diario', 'ajustes']
  it('acepta un respaldo propio y rechaza otros archivos', () => {
    const ok = { formato: FORMATO_RESPALDO, version: 1, creado: 'x', tablas: { habitos: [], diario: [] } }
    expect(validarRespaldo(ok, tablas)).toBeNull()
    expect(validarRespaldo({ hola: 1 }, tablas)).toMatch(/no es un respaldo/)
    expect(validarRespaldo({ ...ok, version: 99 }, tablas)).toMatch(/más nueva/)
    expect(validarRespaldo({ ...ok, tablas: { otra: [] } }, tablas)).toMatch(/desconocidos/)
    expect(validarRespaldo({ ...ok, tablas: { habitos: 'x' } }, tablas)).toMatch(/dañado/)
  })
  it('cuenta lo que trae sin los borrados', () => {
    const r = { formato: FORMATO_RESPALDO, version: 1, creado: 'x', tablas: { habitos: [{ borrado: false }, { borrado: true }], diario: [{}] } } as const
    expect(contarRespaldo(r as never)).toMatchObject({ habitos: 1, diario: 1, tareas: 0 })
  })
})

describe('semana en curso', () => {
  it('no cuenta como fallas los días que todavía no llegaron', () => {
    const d = { habitos: [habito('leer')], registros: [reg('leer', '2026-11-02'), reg('leer', '2026-11-03')], animo: [], foco: [], tareas: [], diario: [] }
    expect(resumenSemana(d, '2026-11-04', '2026-11-04').total).toEqual({ hechos: 2, esperados: 3, porcentaje: 67 })
  })
})
