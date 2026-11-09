import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AgendaHoy from '../components/AgendaHoy'
import CheckinAnimo from '../components/CheckinAnimo'
import Tarjeta from '../components/Tarjeta'
import { campo } from '../components/ui'
import { db, guardarAjuste, registrarHabito } from '../lib/db'
import { fraseDelDia } from '../lib/frases'
import { semanaParaRevisar } from './Revision'
import { useFoco } from '../lib/foco'
import { formatoReloj, NOMBRE_FASE, restante } from '../lib/focoLogica'
import { useNombre } from '../lib/perfil'
import { fechaCorta, fechaLarga, hoyISO, inicialDia, saludo, ultimosDias } from '../lib/fechas'
import { tocaEseDia } from '../lib/rachas'
import { useHabitos, type HabitoConDatos } from '../lib/useHabitos'

function FilaHabito({ datos, dias, hoy }: { datos: HabitoConDatos; dias: string[]; hoy: string }) {
  const { habito: h, estados, racha } = datos
  const estadoHoy = estados.get(hoy)
  const metaSemanal = h.frecuencia === 'semanal' && racha.semanaActual >= h.vecesPorSemana
  const hecho = !!estadoHoy

  const alternarCompleto = async () => {
    const marcar = estadoHoy !== 'completo'
    await registrarHabito(h.id, hoy, marcar ? 'completo' : null)
  }
  const alternarMinimo = async () => {
    const marcar = estadoHoy !== 'minimo'
    await registrarHabito(h.id, hoy, marcar ? 'minimo' : null)
  }

  const claseDia = (d: string) => {
    const e = estados.get(d)
    if (e === 'completo') return 'bg-acento'
    if (e === 'minimo') return 'bg-dia-hecho'
    if (h.frecuencia === 'dias' && !tocaEseDia(h, d)) return 'bg-linea'
    return 'bg-pista'
  }

  let detalle = h.meta ? h.meta : ''
  if (h.disparador) detalle = `Después de ${h.disparador}${detalle ? ` · ${detalle}` : ''}`

  let textoRacha = `${racha.actual} ${racha.unidad === 'días' ? (racha.actual === 1 ? 'día' : 'días') : racha.actual === 1 ? 'semana' : 'semanas'}`
  let aviso = ''
  if (h.frecuencia === 'semanal') aviso = metaSemanal ? 'Meta semanal cumplida' : `Esta semana ${racha.semanaActual}/${h.vecesPorSemana}`
  else if (racha.graciaUsada > 0 && !hecho) aviso = `Usaste ${racha.graciaUsada} de ${h.diasGracia} días de gracia`
  if (racha.actual === 0) textoRacha = 'Sin racha'

  return (
    <li className="flex flex-wrap items-center gap-4.5 border-t border-linea py-3.5">
      <button
        type="button"
        onClick={alternarCompleto}
        aria-pressed={estadoHoy === 'completo'}
        aria-label={`${estadoHoy === 'completo' ? 'Desmarcar' : 'Marcar como hecho'} ${h.nombre}`}
        className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-lg font-bold transition-colors ${
          estadoHoy === 'completo'
            ? 'border-acento bg-acento text-sobre-acento'
            : estadoHoy === 'minimo'
              ? 'border-dia-hecho bg-dia-hecho text-sobre-acento'
              : 'border-check-vacio bg-superficie text-transparent hover:border-acento'
        }`}
      >
        ✓
      </button>

      <span className="min-w-0 flex-1 basis-[calc(100%-62px)] md:basis-auto md:min-w-52">
        <span className="block font-semibold">
          {h.nombre}
          {estadoHoy === 'minimo' && <span className="ml-2 rounded-full bg-acento-suave px-2 py-0.5 text-xs font-medium text-acento-fuerte">Mínimo</span>}
        </span>
        {detalle && <span className="mt-0.5 block text-[13px] text-texto-suave">{detalle}</span>}
        {h.versionMinima && estadoHoy !== 'completo' && (
          <button type="button" onClick={alternarMinimo} className="mt-1 text-[13px] font-medium text-acento underline-offset-4 hover:underline">
            {estadoHoy === 'minimo' ? 'Deshacer mínimo' : `Hice el mínimo (${h.versionMinima})`}
          </button>
        )}
      </span>

      <span className="ml-[62px] flex gap-1.5 md:ml-0" aria-label={`Últimos 7 días: ${dias.filter((d) => estados.has(d)).length} registrados`}>
        {dias.map((d) => (
          <span key={d} className="flex flex-col items-center gap-1" aria-hidden>
            <span className={`h-4 w-4 rounded-[5px] ${claseDia(d)}`} />
            <span className="text-[10.5px] text-texto-suave">{inicialDia(d)}</span>
          </span>
        ))}
      </span>

      <span className="ml-auto text-right md:w-40">
        <span className="block text-sm font-semibold text-acento">{textoRacha}</span>
        {aviso && <span className="block text-xs text-texto-suave">{aviso}</span>}
      </span>
    </li>
  )
}

/** De viernes a martes, si la semana a revisar no tiene revisión, la sugiere. */
function AvisoRevision({ hoy }: { hoy: string }) {
  const semana = semanaParaRevisar(hoy)
  const hecha = useLiveQuery(() => db.revisiones.where('semana').equals(semana).filter((r) => !r.borrado).count(), [semana])
  const dia = new Date(hoy + 'T12:00').getDay()
  if (hecha === undefined || hecha > 0 || ![5, 6, 0, 1, 2].includes(dia)) return null
  return (
    <Link to={`/revision?semana=${semana}`} className="flex flex-wrap items-center gap-3 rounded-[20px] bg-acento-suave px-6 py-4 text-acento-fuerte hover:brightness-[0.98]">
      <span className="flex-1">
        <span className="block font-semibold">Tu revisión semanal te espera</span>
        <span className="block text-sm">Semana del {fechaCorta(semana)}: cinco minutos para ver cómo te fue y elegir tus prioridades.</span>
      </span>
      <span className="text-sm font-semibold">Hacerla →</span>
    </Link>
  )
}

function PedirNombre() {
  const [valor, setValor] = useState('')
  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (valor.trim()) await guardarAjuste('nombre', valor.trim())
  }
  return (
    <form onSubmit={guardar} className="mt-2 flex flex-wrap items-center gap-2">
      <label htmlFor="pedir-nombre" className="text-sm text-texto-suave">¿Cómo querés que te llame?</label>
      <input id="pedir-nombre" className={`${campo} py-1.5 text-sm`} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Tu nombre" />
      <button type="submit" className="min-h-9 rounded-lg border border-borde px-3 text-sm hover:bg-acento-suave">Guardar</button>
    </form>
  )
}

function TarjetaFoco({ hoy }: { hoy: string }) {
  const { estado } = useFoco()
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (estado.estado !== 'corriendo') return
    const id = setInterval(() => setAhora(Date.now()), 500)
    return () => clearInterval(id)
  }, [estado.estado])
  const minutos = useLiveQuery(async () => (await db.foco.where('fecha').equals(hoy).filter((s) => !s.borrado).toArray()).reduce((n, s) => n + s.minutos, 0), [hoy])
  const enMarcha = estado.estado !== 'detenido'
  return (
    <Tarjeta>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Foco</h2>
        <Link to="/foco" className="text-sm font-medium text-acento">Abrir →</Link>
      </div>
      {enMarcha ? (
        <p className="text-[15px]">
          <span className="text-3xl font-semibold tabular-nums">{formatoReloj(restante(estado, ahora))}</span>
          <span className="ml-2 text-texto-suave">{estado.estado === 'pausado' ? 'en pausa' : NOMBRE_FASE[estado.fase].toLowerCase()}</span>
          {estado.vinculo.titulo && <span className="mt-1 block text-sm text-texto-suave">{estado.vinculo.titulo}</span>}
        </p>
      ) : (
        <p className="text-[15px] text-texto-suave">
          Hoy llevás <strong className="text-texto">{minutos ?? 0} min</strong> de foco. Tocá "Enfocarme" en un bloque de tu rutina para arrancar con ese tema.
        </p>
      )}
    </Tarjeta>
  )
}

export default function Hoy() {
  const dias = ultimosDias(7)
  const hoy = hoyISO()
  const lista = useHabitos()
  const nombre = useNombre()
  const frase = fraseDelDia(hoy)

  const tocan = lista?.filter((x) => tocaEseDia(x.habito, hoy)) ?? []
  const noTocan = lista?.filter((x) => !tocaEseDia(x.habito, hoy)) ?? []
  const listo = (x: HabitoConDatos) =>
    x.estados.has(hoy) || (x.habito.frecuencia === 'semanal' && x.racha.semanaActual >= x.habito.vecesPorSemana)
  const hechos = tocan.filter(listo).length
  const total = tocan.length
  const porcentaje = total ? Math.round((hechos / total) * 100) : 0

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="mb-1.5 text-[15px] text-texto-suave">{fechaLarga()}</p>
          <h1 className="text-[30px] md:text-[38px] font-semibold tracking-tight">
            {saludo()}
            {nombre ? `, ${nombre}` : ''}
          </h1>
          {nombre === '' && <PedirNombre />}
          {frase && (
            <p className="mt-2 text-[15px] text-texto-suave">
              “{frase.texto}”
            </p>
          )}
        </div>
        <div className="flex w-full items-center gap-3.5 rounded-2xl bg-superficie px-5 py-3.5 md:w-auto">
          <span className="text-sm text-texto-suave">Progreso del día</span>
          <span
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-pista md:w-40 md:flex-none"
            role="progressbar"
            aria-valuenow={porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de hábitos de hoy"
          >
            <span className="block h-2.5 rounded-full bg-acento transition-all duration-300" style={{ width: `${porcentaje}%` }} />
          </span>
          <span className="text-[15px] font-semibold tabular-nums">
            {hechos}/{total}
          </span>
        </div>
      </header>

      <Tarjeta>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Hábitos de hoy</h2>
          <span className="text-sm text-texto-suave">Últimos 7 días</span>
        </div>
        {lista && tocan.length === 0 && (
          <p className="border-t border-linea py-4 text-[15px] text-texto-suave">
            Hoy no te toca ningún hábito. <Link to="/habitos" className="font-medium text-acento">Ver hábitos</Link>
          </p>
        )}
        <ul>
          {tocan.map((x) => (
            <FilaHabito key={x.habito.id} datos={x} dias={dias} hoy={hoy} />
          ))}
        </ul>
        {noTocan.length > 0 && (
          <p className="border-t border-linea pt-3.5 text-sm text-texto-suave">
            Hoy no toca: {noTocan.map((x) => x.habito.nombre).join(', ')}
          </p>
        )}
      </Tarjeta>

      <AvisoRevision hoy={hoy} />

      <AgendaHoy />

      <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
        <Tarjeta>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">¿Cómo estás hoy?</h2>
            <Link to="/diario" className="text-sm font-medium text-acento">Escribir en el diario →</Link>
          </div>
          <CheckinAnimo fecha={hoy} compacto />
        </Tarjeta>
        <TarjetaFoco hoy={hoy} />
      </div>
    </div>
  )
}
