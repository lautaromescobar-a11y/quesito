import { describe, expect, it } from 'vitest'
import type { CheckinAnimo, EntradaDiario } from './db'
import { agregarPregunta, buscarEntradas, esperaRestante, etiquetasUsadas, hashPin, limpiarEtiqueta, pinValido, promedio, recuerdos, resumen } from './diario'

const base = { actualizado: '2026-01-01T00:00:00Z', borrado: false }
const entrada = (fecha: string, texto: string, etiquetas: string[] = [], titulo = ''): EntradaDiario => ({ ...base, id: fecha, fecha, titulo, texto, etiquetas })
const checkin = (fecha: string, animo: CheckinAnimo['animo'], energia: CheckinAnimo['energia']): CheckinAnimo => ({ ...base, id: fecha, fecha, animo, energia, nota: '' })

describe('diario', () => {
  const es = [
    entrada('2026-11-01', 'Fui al gimnasio y después estudié Tráfico', ['facu', 'gym']),
    entrada('2026-10-02', 'Día tranquilo, leí un capítulo', ['lectura']),
    entrada('2025-11-01', 'Primer día del diario', [], 'Inicio'),
    { ...entrada('2026-10-25', 'borrada'), borrado: true },
  ]

  it('busca sin importar tildes ni mayúsculas y exige todas las palabras', () => {
    expect(buscarEntradas(es, 'trafico GIMNASIO').map((e) => e.fecha)).toEqual(['2026-11-01'])
    expect(buscarEntradas(es, 'dia').map((e) => e.fecha)).toEqual(['2026-10-02', '2025-11-01'])
    expect(buscarEntradas(es, 'borrada')).toEqual([])
  })

  it('filtra por etiqueta y ordena de la más nueva a la más vieja', () => {
    expect(buscarEntradas(es, '', 'lectura').map((e) => e.fecha)).toEqual(['2026-10-02'])
    expect(buscarEntradas(es, '').map((e) => e.fecha)).toEqual(['2026-11-01', '2026-10-02', '2025-11-01'])
  })

  it('cuenta etiquetas y las limpia', () => {
    expect(etiquetasUsadas(es)[0].veces).toBe(1)
    expect(limpiarEtiqueta('  #Mi Día ')).toBe('mi-día')
  })

  it('encuentra recuerdos de hace un mes y un año', () => {
    const r = recuerdos(es, '2026-11-01')
    expect(r.map((x) => x.cuando)).toEqual(['Hace un año'])
    expect(recuerdos(es, '2026-11-02').map((x) => x.cuando)).toEqual(['Hace un mes'])
  })

  it('hace un mes desde el 31 cae en el último día del mes anterior', () => {
    const r = recuerdos([entrada('2026-02-28', 'x')], '2026-03-31')
    expect(r.map((x) => x.cuando)).toEqual(['Hace un mes'])
  })

  it('agrega preguntas guía y arma el resumen', () => {
    expect(agregarPregunta('', 'Hoy agradezco:')).toBe('Hoy agradezco: ')
    expect(agregarPregunta('Algo\n\n', 'Mañana quiero:')).toBe('Algo\n\nMañana quiero: ')
    expect(resumen({ titulo: '', texto: '\n  Primera línea\nsegunda' })).toBe('Primera línea')
    expect(resumen({ titulo: 'Título', texto: 'x' })).toBe('Título')
  })
})

describe('ánimo', () => {
  it('promedia los días con registro dentro del rango', () => {
    const cs = [checkin('2026-11-02', 4, 3), checkin('2026-11-01', 2, 2), checkin('2026-10-20', 5, 5)]
    expect(promedio(cs, '2026-11-02', 7)).toEqual({ dias: 2, animo: 3, energia: 2.5 })
    expect(promedio(cs, '2026-10-10', 7)).toEqual({ dias: 0, animo: null, energia: null })
  })
})

describe('PIN', () => {
  it('valida 4 números', () => {
    expect(pinValido('0420')).toBe(true)
    expect(pinValido('123')).toBe(false)
    expect(pinValido('12a4')).toBe(false)
  })
  it('el hash depende del PIN y de la sal', async () => {
    const a = await hashPin('1234', 'sal1')
    expect(a).toHaveLength(64)
    expect(await hashPin('1234', 'sal1')).toBe(a)
    expect(await hashPin('1234', 'sal2')).not.toBe(a)
    expect(await hashPin('1235', 'sal1')).not.toBe(a)
  })
  it('después de 5 fallos hay que esperar 30 segundos', () => {
    expect(esperaRestante(4, 1000, 1500)).toBe(0)
    expect(esperaRestante(5, 1000, 11_000)).toBe(20_000)
    expect(esperaRestante(5, 1000, 40_000)).toBe(0)
  })
})
