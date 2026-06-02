import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { applyTheme, loadTheme, setDarkMode, loadDarkMode } from './lib/theme.js'

applyTheme(loadTheme())
setDarkMode(loadDarkMode())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
