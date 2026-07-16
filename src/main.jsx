import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { runtime } from './store/runtime';
import { useGame } from './store/gameStore';
import { ladders, bouncers, findBouncer } from './level/ladders';
import { installAssetPipeline, preloadAll } from './utils/assets';

// redirige les textures des kits glTF vers leur sous-dossier textures/,
// puis lance le préchargement (l'écran de chargement suit la progression)
installAssetPipeline();
preloadAll();

// Handle de debug/outillage (tests automatisés, curieux de la console)
window.__journey = { runtime, useGame, ladders, bouncers, findBouncer };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
