import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { runtime } from './store/runtime';
import { useGame } from './store/gameStore';
import { buildRoute } from './components/level/route';

// Handle de debug/outillage (tests automatisés, curieux de la console)
window.__journey = { runtime, useGame, buildRoute };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
