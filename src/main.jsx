import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter} from "react-router-dom";
import { NumerosProvider } from './context/NumerosContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NumerosProvider>
        <AuthProvider>
      <App />
      </AuthProvider>
      </NumerosProvider>
    </BrowserRouter>
   
  </StrictMode>
)
