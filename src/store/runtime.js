import * as THREE from 'three';
import { START_POS } from '../constants';

// État runtime mutable, mis à jour à chaque frame par les systèmes.
// Volontairement hors de React/Zustand : lu par le HUD via rAF, par la caméra,
// le modèle du joueur, l'audio... sans provoquer de re-render.
export const runtime = {
  // temps
  timeScale: 1,
  targetTimeScale: 1,
  simTime: 0, // temps simulé cumulé (respecte le slow-motion)
  timer: 0, // chrono speedrun (temps réel)
  timerRunning: false,

  // jauge slow-motion (0..1)
  slowmo: 1,
  slowmoActive: false,

  // joueur
  playerBody: null, // ref vers le RigidBody Rapier du joueur
  playerPos: new THREE.Vector3(...START_POS),
  playerVel: new THREE.Vector3(),
  grounded: true,
  mode: 'move', // move | ladder | mantle
  speed: 0,
  faceYaw: Math.PI,
  climbDir: 0, // -1/0/1 sur l'échelle (pour l'anim)
  inWind: 0, // nombre de colonnes de vent contenant le joueur
  landedAt: -10, // simTime du dernier atterrissage (squash anim)
  bouncedAt: -10, // simTime du dernier rebond de trampoline

  // caméra
  camYaw: 0,

  // monde (bande actuelle)
  biome: 'village',
  biomeLabel: 'Le Village',
  biomeChangedAt: 0,

  // UI
  fade: 1, // écran noir (1 = opaque), démarre noir pour le fondu d'entrée
  fadeTarget: 0,
};

export function resetRuntime() {
  runtime.timeScale = 1;
  runtime.targetTimeScale = 1;
  runtime.simTime = 0;
  runtime.timer = 0;
  runtime.timerRunning = false;
  runtime.slowmo = 1;
  runtime.slowmoActive = false;
  runtime.playerPos.set(...START_POS);
  runtime.playerVel.set(0, 0, 0);
  runtime.grounded = true;
  runtime.mode = 'move';
  runtime.speed = 0;
  runtime.faceYaw = Math.PI;
  runtime.climbDir = 0;
  runtime.inWind = 0;
  runtime.biome = 'bedroom';
  runtime.biomeLabel = 'La Chambre';
  runtime.fadeTarget = 0;
}
