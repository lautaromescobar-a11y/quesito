import type { ReactNode } from 'react'

export default function Tarjeta({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] bg-superficie p-5 md:p-7">
      {titulo && <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>}
      {children}
    </section>
  )
}
