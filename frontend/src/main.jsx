import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext'
import axios from 'axios'

window.addEventListener('error', e => console.error('GLOBAL ERROR:', e.error));
window.addEventListener('unhandledrejection', e => console.error('GLOBAL PROMISE ERROR:', e.reason));
const oldError = console.error;
console.error = (...args) => {
  console.log('CONSOLE.ERROR INTERCEPT:', ...args);
  oldError(...args);
};

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
