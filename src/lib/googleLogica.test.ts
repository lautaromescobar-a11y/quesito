import { describe, expect, it } from 'vitest'
import type { Evento } from './db'
import { aGoogle, deGoogle, pendienteDeEnvio } from './googleLogica'

const cal = { id: 'c1', nombre: 'Facultad', color: '#4285F4' }

describe('deGoogle', () => {
  it('evento con hora en el mismo día', () => {
    const f = deGoogle({ id: 'a', summary: ' Parcial ', start: { dateTime: '2026-11-10T09:00:00' }, end: { dateTime: '2026-11-10T11:30:00' }, htmlLink: 'x' }, cal)
    expect(f).toEqual([{ id: 'c1|a|2026-11-10', calendarioId: 'c1', calendario: 'Facultad', titulo: 'Parcial', fecha: '2026-11-10', inicio: '09:00', fin: '11:30', color: '#4285F4', enlace: 'x' }])
  })
  it('todo el día de varios días (fin exclusivo)', () => {
    const f = deGoogle({ id: 'v', start: { date: '2026-12-30' }, end: { date: '2027-01-02' } }, cal)
    expect(f.map((x) => [x.fecha, x.inicio])).toEqual([['2026-12-30', null], ['2026-12-31', null], ['2027-01-01', null]])
    expect(f[0].titulo).toBe('(Sin título)')
  })
  it('con hora que cruza la medianoche', () => {
    const f = deGoogle({ id: 'n', start: { dateTime: '2026-11-10T22:00:00' }, end: { dateTime: '2026-11-12T01:00:00' } }, cal)
    expect(f.map((x) => [x.fecha, x.inicio, x.fin])).toEqual([
      ['2026-11-10', '22:00', '23:59'],
      ['2026-11-11', null, null],
      ['2026-11-12', '00:00', '01:00'],
    ])
  })
  it('termina justo a medianoche', () => {
    const f = deGoogle({ id: 'm', start: { dateTime: '2026-11-10T20:00:00' }, end: { dateTime: '2026-11-11T00:00:00' } }, cal)
    expect(f).toHaveLength(1)
  })
  it('ignora cancelados y ubicación de trabajo', () => {
    expect(deGoogle({ id: 'x', status: 'cancelled', start: { date: '2026-11-10' }, end: { date: '2026-11-11' } }, cal)).toEqual([])
    expect(deGoogle({ id: 'y', eventType: 'workingLocation', start: { date: '2026-11-10' }, end: { date: '2026-11-11' } }, cal)).toEqual([])
  })
  it('limita los eventos larguísimos', () => {
    expect(deGoogle({ id: 'z', start: { date: '2026-01-01' }, end: { date: '2027-01-01' } }, cal).length).toBe(62)
  })
})

describe('aGoogle', () => {
  it('con hora y semanal', () => {
    expect(aGoogle({ titulo: 'Gym', fecha: '2026-11-09', inicio: '18:00', fin: '19:00', repeticion: 'semanal' }, 'America/Argentina/Cordoba')).toMatchObject({
      summary: 'Gym',
      start: { dateTime: '2026-11-09T18:00:00', timeZone: 'America/Argentina/Cordoba' },
      end: { dateTime: '2026-11-09T19:00:00' },
      recurrence: ['RRULE:FREQ=WEEKLY'],
    })
  })
  it('todo el día, sin repetir', () => {
    expect(aGoogle({ titulo: 'Feriado', fecha: '2026-11-30', inicio: null, fin: null, repeticion: 'ninguna' }, 'X')).toMatchObject({
      start: { date: '2026-11-30' },
      end: { date: '2026-12-01' },
      recurrence: [],
    })
  })
})

describe('pendienteDeEnvio', () => {
  const e = { origen: 'propio', actualizado: 't1', borrado: false } as Evento
  it('nuevo, cambiado y ya enviado', () => {
    expect(pendienteDeEnvio(e)).toBe(true)
    expect(pendienteDeEnvio({ ...e, googleId: 'g', googleEnviado: 't1' })).toBe(false)
    expect(pendienteDeEnvio({ ...e, googleId: 'g', googleEnviado: 't0' })).toBe(true)
  })
  it('borrados: solo si estaban en Google', () => {
    expect(pendienteDeEnvio({ ...e, borrado: true })).toBe(false)
    expect(pendienteDeEnvio({ ...e, borrado: true, googleId: 'g', googleEnviado: 't0' })).toBe(true)
  })
  it('los de Google nunca se envían', () => {
    expect(pendienteDeEnvio({ ...e, origen: 'google' })).toBe(false)
  })
})
