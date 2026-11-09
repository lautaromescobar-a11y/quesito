import { useState } from 'react'
import FormularioHabito from '../components/FormularioHabito'
import MapaCalor from '../components/MapaCalor'
import { cambiarHabito, type Habito } from '../lib/db'
import { textoFrecuencia } from '../lib/rachas'
import { useHabitos, type HabitoConDatos } from '../lib/useHabitos'

const botonChico = 'min-h-9 rounded-lg border border-borde px-3 text-sm hover:bg-acento-suave'

function TarjetaHabito({ datos, alEditar }: { datos: HabitoConDatos; alEditar: () => void }) {
  const { habito: h, racha } = datos
  const [confirmar, setConfirmar] = useState(false)

  return (
    <article className={`rounded-[20px] bg-superficie p-7 ${h.activo ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {h.nombre}
            {!h.activo && <span className="ml-2 align-middle text-xs font-medium text-texto-suave">Archivado</span>}
          </h2>
          <p className="mt-1 text-[15px] text-texto-suave">
            {h.disparador ? `Después de ${h.disparador} → ` : ''}
            {h.meta || h.nombre}
          </p>
          <p className="mt-1 text-sm text-texto-suave">
            {textoFrecuencia(h)}
            {h.versionMinima && ` · Mínimo: ${h.versionMinima}`}
            {h.frecuencia !== 'semanal' && ` · ${h.diasGracia} ${h.diasGracia === 1 ? 'día' : 'días'} de gracia`}
            {h.horaRecordatorio && ` · Aviso ${h.horaRecordatorio}`}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-acento">{racha.actual}</p>
            <p className="text-xs text-texto-suave">racha ({racha.unidad})</p>
          </div>
          <div>
            <p className="text-3xl font-semibold tabular-nums">{racha.mejor}</p>
            <p className="text-xs text-texto-suave">mejor racha</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <MapaCalor datos={datos} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-linea pt-4">
        <button type="button" className={botonChico} onClick={alEditar}>Editar</button>
        <button type="button" className={botonChico} onClick={() => cambiarHabito(h.id, { activo: !h.activo })}>
          {h.activo ? 'Archivar' : 'Reactivar'}
        </button>
        {confirmar ? (
          <span className="flex items-center gap-2 text-sm">
            ¿Eliminar {h.nombre} y su historial?
            <button type="button" className={`${botonChico} border-red-300 text-red-700 dark:text-red-300`} onClick={() => cambiarHabito(h.id, { borrado: true })}>
              Sí, eliminar
            </button>
            <button type="button" className={botonChico} onClick={() => setConfirmar(false)}>No</button>
          </span>
        ) : (
          <button type="button" className={botonChico} onClick={() => setConfirmar(true)}>Eliminar</button>
        )}
      </div>
    </article>
  )
}

export default function Habitos() {
  const [verArchivados, setVerArchivados] = useState(false)
  const [editando, setEditando] = useState<Habito | 'nuevo' | null>(null)
  const lista = useHabitos(true)
  const visibles = lista?.filter((x) => verArchivados || x.habito.activo)
  const archivados = lista?.filter((x) => !x.habito.activo).length ?? 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[38px] font-semibold tracking-tight">Hábitos</h1>
          <p className="text-[15px] text-texto-suave">Configurá cada hábito y mirá cómo viene tu constancia.</p>
        </div>
        <button type="button" onClick={() => setEditando('nuevo')} className="min-h-11 rounded-xl bg-acento px-5 text-[15px] font-semibold text-sobre-acento hover:opacity-90">
          Nuevo hábito
        </button>
      </header>

      {visibles?.length === 0 && (
        <p className="rounded-[20px] bg-superficie p-7 text-texto-suave">Todavía no tenés hábitos. Creá el primero con "Nuevo hábito".</p>
      )}

      {visibles?.map((x) => (
        <TarjetaHabito key={x.habito.id} datos={x} alEditar={() => setEditando(x.habito)} />
      ))}

      {archivados > 0 && (
        <button type="button" onClick={() => setVerArchivados(!verArchivados)} className="text-sm font-medium text-acento underline-offset-4 hover:underline">
          {verArchivados ? 'Ocultar archivados' : `Ver archivados (${archivados})`}
        </button>
      )}

      {editando && <FormularioHabito habito={editando === 'nuevo' ? undefined : editando} alCerrar={() => setEditando(null)} />}
    </div>
  )
}
