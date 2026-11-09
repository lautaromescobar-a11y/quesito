import { useState } from 'react'
import { Link } from 'react-router-dom'
import GraficoSemanas from '../components/GraficoSemanas'
import Tarjeta from '../components/Tarjeta'
import { animoSegunHabitos, cumplimiento, cumplimientoTotal, resumenSemana, ultimasSemanas } from '../lib/estadisticas'
import { hoyISO } from '../lib/fechas'
import { calcularRacha, textoFrecuencia } from '../lib/rachas'
import { useDatosResumen } from '../lib/useResumen'

const PERIODOS = [
  { semanas: 4, nombre: '4 semanas' },
  { semanas: 12, nombre: '12 semanas' },
  { semanas: 26, nombre: '6 meses' },
]

function Numero({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div>
      <p className="text-sm text-texto-suave">{titulo}</p>
      <p className="text-3xl font-semibold tabular-nums">{valor}</p>
      {detalle && <p className="text-xs text-texto-suave">{detalle}</p>}
    </div>
  )
}

export default function Estadisticas() {
  const [cuantas, setCuantas] = useState(4)
  const datos = useDatosResumen()
  if (!datos) return null

  const hoy = hoyISO()
  const semanas = ultimasSemanas(hoy, cuantas)
  const desde = semanas[0]
  const resumenes = semanas.map((s) => resumenSemana(datos, s, hoy))
  const activos = datos.habitos.filter((h) => h.activo)
  const total = cumplimientoTotal(activos, datos.registros, desde, hoy)
  const minutos = resumenes.reduce((n, r) => n + r.minutosFoco, 0)
  const tareas = resumenes.reduce((n, r) => n + r.tareasHechas, 0)
  const conAnimo = resumenes.filter((r) => r.animo !== null)
  const animoProm = conAnimo.length ? Math.round((conAnimo.reduce((n, r) => n + r.animo! * r.diasAnimo, 0) / conAnimo.reduce((n, r) => n + r.diasAnimo, 0)) * 10) / 10 : null
  const patron = animoSegunHabitos(datos.habitos, datos.registros, datos.animo, desde, hoy)
  const hayDatos = datos.registros.length + datos.animo.length + datos.foco.length > 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[38px] font-semibold tracking-tight">Estadísticas</h1>
          <p className="text-[15px] text-texto-suave">Cómo vienen tus hábitos, tu ánimo y tu foco, semana a semana.</p>
        </div>
        <div role="tablist" aria-label="Período" className="flex gap-1 rounded-xl bg-superficie p-1">
          {PERIODOS.map((p) => (
            <button key={p.semanas} type="button" role="tab" aria-selected={cuantas === p.semanas} onClick={() => setCuantas(p.semanas)} className={`min-h-10 rounded-lg px-4 text-[15px] ${cuantas === p.semanas ? 'bg-acento-suave font-semibold text-acento-fuerte' : 'text-texto-suave'}`}>
              {p.nombre}
            </button>
          ))}
        </div>
      </header>

      {!hayDatos ? (
        <p className="rounded-[20px] bg-superficie p-7 text-texto-suave">Todavía no hay datos. Marcá tus hábitos, registrá tu ánimo y usá el foco unos días, y acá vas a ver cómo venís.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-6 rounded-[20px] bg-superficie p-7 md:grid-cols-4">
            <Numero titulo="Hábitos cumplidos" valor={total.porcentaje === null ? '–' : `${total.porcentaje}%`} detalle={`${total.hechos} de ${total.esperados}`} />
            <Numero titulo="Ánimo promedio" valor={animoProm === null ? '–' : `${animoProm}/5`} />
            <Numero titulo="Foco" valor={`${Math.floor(minutos / 60)} h ${minutos % 60} min`} detalle={`${Math.round(minutos / cuantas)} min por semana`} />
            <Numero titulo="Tareas hechas" valor={String(tareas)} />
          </section>

          <Tarjeta titulo="Hábitos cumplidos por semana">
            <GraficoSemanas semanas={semanas} tipo="barras" max={100} unidad="%" series={[{ nombre: 'Hábitos', color: 'var(--color-acento)', valores: resumenes.map((r) => r.total.porcentaje) }]} descripcion="Porcentaje de hábitos cumplidos por semana" />
          </Tarjeta>

          {activos.length > 0 && (
            <Tarjeta titulo="Cada hábito">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-texto-suave">
                    <tr>
                      <th className="py-2 font-medium">Hábito</th>
                      <th className="py-2 font-medium">Frecuencia</th>
                      <th className="py-2 text-right font-medium">Cumplido</th>
                      <th className="py-2 text-right font-medium">Racha</th>
                      <th className="py-2 text-right font-medium">Mejor racha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activos.map((h) => {
                      const c = cumplimiento(h, datos.registros, desde, hoy)
                      const fechas = new Set(datos.registros.filter((r) => r.habitoId === h.id && r.estado !== 'omitido').map((r) => r.fecha))
                      const racha = calcularRacha(h, fechas, hoy)
                      return (
                        <tr key={h.id} className="border-t border-linea">
                          <td className="py-2.5 font-medium">{h.nombre}</td>
                          <td className="py-2.5 text-texto-suave">{textoFrecuencia(h)}</td>
                          <td className="py-2.5 text-right tabular-nums">{c.porcentaje === null ? '–' : `${c.porcentaje}% (${c.hechos}/${c.esperados})`}</td>
                          <td className="py-2.5 text-right tabular-nums">{racha.actual} {racha.unidad}</td>
                          <td className="py-2.5 text-right tabular-nums">{racha.mejor} {racha.unidad}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Tarjeta titulo="Ánimo y energía (promedio semanal)">
              <GraficoSemanas
                semanas={semanas}
                tipo="linea"
                min={1}
                max={5}
                series={[
                  { nombre: 'Ánimo', color: 'var(--color-acento)', valores: resumenes.map((r) => r.animo) },
                  { nombre: 'Energía', color: '#4F7BD1', valores: resumenes.map((r) => r.energia), guiones: '6 4' },
                ]}
                descripcion="Promedio semanal de ánimo y energía, de 1 a 5"
              />
            </Tarjeta>
            <Tarjeta titulo="Minutos de foco por semana">
              <GraficoSemanas semanas={semanas} tipo="barras" series={[{ nombre: 'Foco', color: '#4F7BD1', valores: resumenes.map((r) => r.minutosFoco) }]} descripcion="Minutos de foco por semana" />
            </Tarjeta>
          </div>

          <Tarjeta titulo="Patrones">
            {patron.dias < 5 || patron.conTodos === null || patron.sinTodos === null ? (
              <p className="text-sm text-texto-suave">Con unos días más de hábitos y ánimo registrados, acá vas a ver si tu ánimo cambia los días que cumplís tus hábitos.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-[15px]">
                  Los días que cumpliste <strong>todos</strong> tus hábitos, tu ánimo promedio fue <strong>{patron.conTodos}/5</strong>. Los demás días, <strong>{patron.sinTodos}/5</strong>.
                </p>
                <p className="text-sm text-texto-suave">
                  Basado en {patron.dias} días con registro de ánimo. Es una relación, no una prueba de causa: sirve para observarte.
                </p>
              </div>
            )}
          </Tarjeta>

          <p className="text-sm text-texto-suave">
            Desde el {desde.split('-').reverse().join('/')} hasta hoy. Para reflexionar sobre cada semana, usá la <Link to="/revision" className="font-medium text-acento">revisión semanal</Link>.
          </p>
        </>
      )}
    </div>
  )
}
