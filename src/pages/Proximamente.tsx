export default function Proximamente({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">{titulo}</h1>
      <p className="mt-2 text-texto-suave">Esta sección se construye en la {fase}.</p>
    </div>
  )
}
