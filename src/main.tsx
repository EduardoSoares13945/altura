import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { NavigationProvider } from './navigation/NavigationContext'
import { ThemeProvider } from './theme/ThemeProvider'
import { ToastProvider } from './components/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NavigationProvider>
        <AuthProvider>
          <ToastProvider><App /></ToastProvider>
        </AuthProvider>
      </NavigationProvider>
    </ThemeProvider>
  </StrictMode>,
)
