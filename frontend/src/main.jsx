import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext'
import axios from 'axios'

// Set axios baseURL dynamically for local development to avoid Vite dev server fallback to index.html
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  axios.defaults.baseURL = 'http://localhost:8001';
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
