import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { runtime } from './store/runtime';
import { useGame } from './store/gameStore';
import { ladders, bouncers, findBouncer } from './level/ladders';

// Handle de debug/outillage (tests automatisés, curieux de la console)
window.__journey = { runtime, useGame, ladders, bouncers, findBouncer };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
