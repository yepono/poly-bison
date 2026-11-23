import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from './context/AppDataContext.jsx'
import { DialogosProvider } from './components/Dialogos.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* La ruta base es /poly-bison/ en local y / en producción (sale de VITE_BASE) */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <AppDataProvider>
        <DialogosProvider>
          <App />
        </DialogosProvider>
      </AppDataProvider>
    </BrowserRouter>

  </StrictMode>,
)
