import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { I18nProvider } from './lib/i18n'
import { getTheme, setTheme } from './lib/theme'
import { ErrorBoundary } from './components/debug/ErrorBoundary'
import { ToastProvider } from './components/aura/ToastProvider'

// Initialiser le thème avant le rendu
setTheme(getTheme())

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('❌ Root element not found!')
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
