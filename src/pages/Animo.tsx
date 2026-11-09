import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import CheckinAnimo from '../components/CheckinAnimo'
import GraficoAnimo from '../components/GraficoAnimo'
import Tarjeta from '../components/Tarjeta'
import { db } from '../lib/db'
import { ETIQUETAS_ANIMO, ETIQUETAS_ENERGIA, promedio } from '../lib/diario'
import { fechaRelativa, hoyISO } from '../lib/fechas'
import { sumarDias } from '../lib/rachas'

function Promedio({ titulo, actual, anterior }: { titulo: string; actual: number | null; anterior: number | null }) {
  const dif = actual !== null && anterior !== null ? Math.round((actual - anterior) * 10) / 10 : null
  return (
    <div>
      <p className="text-sm text-texto-suave">{titulo}</p>
      <p className="text-3xl font-semibold tabular-nums">{actual ?? '–'}<span className="text-base font-normal text-texto-suave"> / 5</span></p>
      <p className="text-xs text-texto-suave">
        {dif === null ? 'Sin datos de la semana anterior' : dif === 0 ? 'Igual que la semana anterior' : `${dif > 0 ? '+' : ''}${dif} vs. semana anterior`}
      </p>
    </div>
  )
}

export default function Animo() {
  const hoy = hoyISO()
  const checkins = useLiveQuery(() => db.animo.filter((c) => !c.borrado).toArray())
  const fechasDiario = useLiveQuery(async () => new Set((await db.diario.filter((e) => !e.borrado).toArray()).map((e) => e.fecha)))
  if (!checkins || !fechasDiario) return null

  const semana = promedio(checkins, hoy, 7)
  const anterior = promedio(checkins, sumarDias(hoy, -7), 7)
  const mes = promedio(checkins, hoy, 30)
  const recientes = [...checkins].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-[30px] md:text-[38px] font-semibold tracking-tight">Ánimo y energía</h1>
        <p className="text-[15px] text-texto-suave">Un registro de dos toques por día. Con el tiempo muestra patrones.</p>
      </header>

      <Tarjeta titulo="¿Cómo estás hoy?">
        <CheckinAnimo fecha={hoy} />
      </Tarjeta>

      <section className="grid gap-6 rounded-[20px] bg-superficie p-5 md:p-7 sm:grid-cols-3">
        <Promedio titulo="Ánimo, últimos 7 días" actual={semana.animo} anterior={anterior.animo} />
        <Promedio titulo="Energía, últimos 7 días" actual={semana.energia} anterior={anterior.energia} />
        <div>
          <p className="text-sm text-texto-suave">Días registrados</p>
          <p className="text-3xl font-semibold tabular-nums">{mes.dias}<span className="text-base font-normal text-texto-suave"> de 30</span></p>
          <p className="text-xs text-texto-suave">Últimos 30 días</p>
        </div>
      </section>

      <Tarjeta titulo="Últimos 30 días">
        {checkins.length < 2 ? (
          <p className="text-sm text-texto-suave">Cuando tengas al menos dos días registrados vas a ver el gráfico acá.</p>
        ) : (
          <GraficoAnimo checkins={checkins} hasta={hoy} />
        )}
      </Tarjeta>

      {recientes.length > 0 && (
        <Tarjeta titulo="Historial">
          <ul>
            {recientes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-linea py-3 first:border-0">
                <span className="w-28 text-sm font-medium">{fechaRelativa(c.fecha)}</span>
                <span className="w-36 text-sm">Ánimo: {c.animo} · {ETIQUETAS_ANIMO[c.animo - 1]}</span>
                <span className="w-40 text-sm">Energía: {c.energia} · {ETIQUETAS_ENERGIA[c.energia - 1]}</span>
                <span className="flex-1 text-sm text-texto-suave">{c.nota}</span>
                {fechasDiario.has(c.fecha) && (
                  <Link to={`/diario?fecha=${c.fecha}`} className="text-sm font-medium text-acento">Ver diario</Link>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  )
}
