import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CartProvider, SettingsProvider } from './lib/store'
import './index.css'

// La demo usa rutas con # para funcionar desde cualquier dirección
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <SettingsProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SettingsProvider>
      </Router>
    </ErrorBoundary>
  </StrictMode>
)
