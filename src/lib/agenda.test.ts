import { describe, expect, it } from 'vitest'
import { aMin, bloquesDelDia, deMin, ocurrencias, plantillaDeFecha, solapados, tareasProximas } from './agenda'
import type { BloqueRutina, CambioSemana, Evento, PlantillaSemana, Tarea, UsoPlantilla } from './db'

const base = { actualizado: '2026-01-01T00:00:00Z', borrado: false }
const plantilla = (id: string, desde: string, hasta: string | null): PlantillaSemana => ({ ...base, id, nombre: id, vigenteDesde: desde, vigenteHasta: hasta, activa: true })
const bloque = (id: string, plantillaId: string, dia: BloqueRutina['dia'], inicio: string, fin: string, titulo = id): BloqueRutina => ({
  ...base, id, plantillaId, dia, inicio, fin, titulo, categoriaId: null, color: '#7FB394', notas: '',
})
const cambio = (id: string, fecha: string, accion: CambioSemana['accion'], bloqueId: string | null, datos: CambioSemana['datos'] = null): CambioSemana => ({
  ...base, id, fecha, accion, bloqueId, datos,
})
const evento = (fecha: string, repeticion: Evento['repeticion']): Evento => ({
  ...base, id: 'e', titulo: 'x', color: '#000', fecha, inicio: null, fin: null, repeticion, categoriaId: null, origen: 'propio',
})

// 2026-11-02 es lunes.
describe('horas', () => {
  it('convierte a minutos y vuelve, incluido 24:00', () => {
    expect(aMin('07:30')).toBe(450)
    expect(aMin('24:00')).toBe(1440)
    expect(deMin(450)).toBe('07:30')
  })
})

describe('qué plantilla usa cada semana', () => {
  const ps = [plantilla('c1', '', null), plantilla('c2', '', null), plantilla('vacia', '', null)]
  const uso = (plantillaId: string | null, tipo: UsoPlantilla['tipo'], desde: string, actualizado = '2026-01-01T00:00:00Z'): UsoPlantilla => ({
    ...base, actualizado, id: `${plantillaId}-${tipo}-${desde}`, plantillaId, tipo, desde,
  })
  const usos = [uso('c1', 'desde', '2026-03-02'), uso('c2', 'desde', '2026-07-27')]

  it('usa el último "desde" que empezó antes o en esa semana', () => {
    expect(plantillaDeFecha(ps, usos, '2026-05-10')?.id).toBe('c1')
    expect(plantillaDeFecha(ps, usos, '2026-11-04')?.id).toBe('c2')
    expect(plantillaDeFecha(ps, usos, '2026-01-10')).toBeUndefined()
  })

  it('un "desde" a mitad de semana cuenta desde el lunes de esa semana', () => {
    // 2026-07-27 es lunes; el jueves 30/07 ya usa c2
    expect(plantillaDeFecha(ps, usos, '2026-07-30')?.id).toBe('c2')
  })

  it('"solo esta semana" gana y no afecta la semana siguiente', () => {
    const conExcepcion = [...usos, uso('vacia', 'semana', '2026-11-02')]
    expect(plantillaDeFecha(ps, conExcepcion, '2026-11-05')?.id).toBe('vacia')
    expect(plantillaDeFecha(ps, conExcepcion, '2026-11-09')?.id).toBe('c2')
  })

  it('semana libre: plantilla null', () => {
    expect(plantillaDeFecha(ps, [...usos, uso(null, 'semana', '2026-11-02')], '2026-11-03')).toBeUndefined()
  })

  it('si hay dos "desde" del mismo lunes gana el más reciente', () => {
    const dos = [uso('c1', 'desde', '2026-11-02', '2026-11-01T10:00:00Z'), uso('c2', 'desde', '2026-11-02', '2026-11-01T11:00:00Z')]
    expect(plantillaDeFecha(ps, dos, '2026-11-02')?.id).toBe('c2')
  })

  it('ignora usos de plantillas borradas', () => {
    const borradas = [{ ...ps[1], borrado: true }]
    expect(plantillaDeFecha(borradas, usos, '2026-11-04')).toBeUndefined()
  })
})

describe('bloques del día con cambios puntuales', () => {
  const p = plantilla('p', '2026-08-01', null)
  const bloques = [bloque('cursada', 'p', 1, '08:00', '12:00'), bloque('gym', 'p', 1, '18:00', '19:30'), bloque('otro', 'p', 2, '08:00', '09:00')]

  it('sin cambios devuelve los bloques del día de la semana, ordenados', () => {
    const r = bloquesDelDia(p, bloques, [], '2026-11-02')
    expect(r.map((x) => x.bloqueId)).toEqual(['cursada', 'gym'])
  })

  it('quitar, mover y agregar afectan solo esa fecha', () => {
    const cambios = [
      cambio('c1', '2026-11-02', 'quitar', 'cursada'),
      cambio('c2', '2026-11-02', 'mover', 'gym', { inicio: '19:00', fin: '20:00' }),
      cambio('c3', '2026-11-02', 'agregar', null, { titulo: 'Turno médico', inicio: '10:00', fin: '11:00', color: '#F2CF66', notas: '' }),
    ]
    const r = bloquesDelDia(p, bloques, cambios, '2026-11-02')
    expect(r.map((x) => [x.titulo, x.inicio, x.modificado])).toEqual([
      ['Turno médico', '10:00', true],
      ['gym', '19:00', true],
    ])
    const lunesSiguiente = bloquesDelDia(p, bloques, cambios, '2026-11-09')
    expect(lunesSiguiente.map((x) => x.inicio)).toEqual(['08:00', '18:00'])
  })

  it('sin plantilla vigente solo muestra lo agregado', () => {
    const r = bloquesDelDia(undefined, bloques, [cambio('c', '2026-11-02', 'agregar', null, { titulo: 'x', inicio: '09:00', fin: '10:00' })], '2026-11-02')
    expect(r).toHaveLength(1)
  })
})

describe('repetición de eventos', () => {
  it('sin repetición', () => {
    expect(ocurrencias(evento('2026-11-10', 'ninguna'), '2026-11-01', '2026-11-30')).toEqual(['2026-11-10'])
    expect(ocurrencias(evento('2026-12-10', 'ninguna'), '2026-11-01', '2026-11-30')).toEqual([])
  })
  it('semanal, empezando antes del rango', () => {
    expect(ocurrencias(evento('2026-10-05', 'semanal'), '2026-11-01', '2026-11-20')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16'])
  })
  it('semanal no aparece antes de su fecha de inicio', () => {
    expect(ocurrencias(evento('2026-11-09', 'semanal'), '2026-11-01', '2026-11-20')).toEqual(['2026-11-09', '2026-11-16'])
  })
  it('mensual saltea meses sin ese día', () => {
    expect(ocurrencias(evento('2026-01-31', 'mensual'), '2026-01-01', '2026-04-30')).toEqual(['2026-01-31', '2026-03-31'])
  })
  it('anual (cumpleaños)', () => {
    expect(ocurrencias(evento('2020-10-14', 'anual'), '2026-01-01', '2027-12-31')).toEqual(['2026-10-14', '2027-10-14'])
  })
})

describe('solapamientos y tareas', () => {
  it('detecta bloques que se pisan pero no los que solo se tocan', () => {
    const r = solapados([
      { clave: 'a', inicio: '08:00', fin: '10:00' },
      { clave: 'b', inicio: '09:30', fin: '11:00' },
      { clave: 'c', inicio: '11:00', fin: '12:00' },
    ])
    expect([...r].sort()).toEqual(['a', 'b'])
  })
  it('tareas próximas: pendientes hasta la fecha, incluidas las vencidas', () => {
    const t = (id: string, fecha: string | null, estado: Tarea['estado'] = 'pendiente'): Tarea => ({ ...base, id, titulo: id, fechaLimite: fecha, estado, prioridad: 'media', categoriaId: null })
    const r = tareasProximas([t('vencida', '2026-10-30'), t('pronto', '2026-11-05'), t('lejos', '2026-12-20'), t('hecha', '2026-11-03', 'hecha'), t('sinfecha', null)], '2026-11-08')
    expect(r.map((x) => x.id)).toEqual(['vencida', 'pronto'])
  })
})

import { actividadesGuardadas } from './agenda'

describe('actividades guardadas', () => {
  it('agrupa por nombre sin importar mayúsculas y toma el color y la duración más usados', () => {
    const bs = [
      { ...bloque('a', 'p', 1, '18:00', '19:30', 'Gimnasio'), color: '#8CC08F' },
      { ...bloque('b', 'p', 3, '18:00', '19:30', 'gimnasio'), color: '#8CC08F' },
      { ...bloque('c', 'p', 5, '17:00', '18:00', 'Gimnasio'), color: '#7FA8E0' },
      bloque('d', 'p', 2, '13:00', '14:00', 'Comida'),
      { ...bloque('e', 'p', 2, '08:00', '09:00', 'Borrado'), borrado: true },
    ]
    const r = actividadesGuardadas(bs, [cambio('x', '2026-11-02', 'agregar', null, { titulo: 'Turno médico', inicio: '10:00', fin: '10:30', color: '#F2CF66', notas: '' })])
    expect(r[0]).toEqual({ titulo: 'Gimnasio', color: '#8CC08F', minutos: 90, veces: 3 })
    expect(r.map((x) => x.titulo)).toEqual(['Gimnasio', 'Comida', 'Turno médico'])
  })
})
