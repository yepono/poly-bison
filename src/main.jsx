import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from './context/AppDataContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* basename = ruta base de Vite (VITE_BASE): /poly-bison/ en local, / en producción */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </BrowserRouter>

  </StrictMode>,
)
