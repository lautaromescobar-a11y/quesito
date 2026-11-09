import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/dm-sans'
import './index.css'
import App from './App.tsx'
import { sembrarDatosIniciales } from './lib/db'
import { cargarTema } from './lib/tema'

await cargarTema()
await sembrarDatosIniciales()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
