import * as THREE from 'three';

// Matériaux partagés (une seule instance chacun → perf).
// Les surfaces grimpables ont un léger emissive : lisibilité "rim light"
// douce, cohérente avec l'ambiance, sans surbrillance arcade.

const std = (opts) => new THREE.MeshStandardMaterial(opts);

export const M = {
  // — Chambre —
  wood: std({ color: '#8a5a35', roughness: 0.8, emissive: '#3a2410', emissiveIntensity: 0.15 }),
  woodDark: std({ color: '#5f3d22', roughness: 0.85, emissive: '#2a1a0c', emissiveIntensity: 0.12 }),
  legoRed: std({ color: '#c0392b', roughness: 0.35, emissive: '#5a1a12', emissiveIntensity: 0.2 }),
  legoBlue: std({ color: '#2d6cdf', roughness: 0.35, emissive: '#122a5a', emissiveIntensity: 0.2 }),
  legoYellow: std({ color: '#e8b13a', roughness: 0.35, emissive: '#6a4a10', emissiveIntensity: 0.2 }),
  legoGreen: std({ color: '#3f9e4d', roughness: 0.35, emissive: '#164a1e', emissiveIntensity: 0.2 }),
  bookA: std({ color: '#a04848', roughness: 0.7, emissive: '#421c1c', emissiveIntensity: 0.15 }),
  bookB: std({ color: '#4a6a9a', roughness: 0.7, emissive: '#1c2a42', emissiveIntensity: 0.15 }),
  bookC: std({ color: '#7a9a5a', roughness: 0.7, emissive: '#2c421c', emissiveIntensity: 0.15 }),
  fabric: std({ color: '#d9a7c7', roughness: 0.95, emissive: '#5a3a4c', emissiveIntensity: 0.1 }),
  mattress: std({ color: '#e8e2d4', roughness: 0.9 }),
  rug: std({ color: '#7a4a6a', roughness: 1 }),
  wallBedroom: std({ color: '#6a5566', roughness: 0.95 }),
  knob: std({ color: '#d8c8a8', roughness: 0.4, metalness: 0.3 }),

  // — École —
  locker: std({ color: '#5a7a6a', roughness: 0.5, metalness: 0.4, emissive: '#1e3a2c', emissiveIntensity: 0.2 }),
  lockerDark: std({ color: '#3e5a4c', roughness: 0.55, metalness: 0.4 }),
  deskTop: std({ color: '#9a8a6a', roughness: 0.6, emissive: '#3a3020', emissiveIntensity: 0.15 }),
  metal: std({ color: '#6a7078', roughness: 0.4, metalness: 0.6, emissive: '#22262c', emissiveIntensity: 0.15 }),
  fence: std({ color: '#3a4148', roughness: 0.6, metalness: 0.5, transparent: true, opacity: 0.75 }),
  chalkboard: std({ color: '#2e4a3a', roughness: 0.8 }),
  neon: std({ color: '#ffffff', emissive: '#dff2ff', emissiveIntensity: 2.2 }),
  shadowPerson: std({ color: '#0c0e14', roughness: 1, transparent: true, opacity: 0.75 }),

  // — Bureau —
  officeGray: std({ color: '#8a8d93', roughness: 0.75, emissive: '#2e3034', emissiveIntensity: 0.15 }),
  officeDark: std({ color: '#55585e', roughness: 0.7, emissive: '#1e2024', emissiveIntensity: 0.12 }),
  cubicle: std({ color: '#9aa0a8', roughness: 0.9, emissive: '#33363c', emissiveIntensity: 0.12 }),
  cubicleTrim: std({ color: '#c8ccd2', roughness: 0.5 }),
  cabinet: std({ color: '#77828c', roughness: 0.45, metalness: 0.5, emissive: '#28303a', emissiveIntensity: 0.18 }),
  screen: std({ color: '#101418', emissive: '#7fd4ff', emissiveIntensity: 1.6 }),
  screenOff: std({ color: '#14161a', roughness: 0.4 }),
  serverRack: std({ color: '#26292e', roughness: 0.5, metalness: 0.6, emissive: '#0e2a1a', emissiveIntensity: 0.35 }),
  serverLed: std({ color: '#111', emissive: '#4dff88', emissiveIntensity: 2.5 }),
  ceiling: std({ color: '#5e6167', roughness: 0.9 }),

  // — Paradis —
  cloud: std({ color: '#ffffff', roughness: 1, emissive: '#fff6e0', emissiveIntensity: 0.4 }),
  lightColumn: std({ color: '#fff2cf', roughness: 0.6, emissive: '#ffe9b0', emissiveIntensity: 1.1 }),
  gold: std({ color: '#e8c878', roughness: 0.3, metalness: 0.7, emissive: '#a87820', emissiveIntensity: 0.5 }),
  marble: std({ color: '#f2ecdc', roughness: 0.5, emissive: '#d8ccae', emissiveIntensity: 0.25 }),

  // — Communs —
  core: std({ color: '#4a4550', roughness: 0.9 }),
  checkpoint: std({ color: '#fff', emissive: '#ffd98a', emissiveIntensity: 1.8, transparent: true, opacity: 0.85 }),
  checkpointDone: std({ color: '#fff', emissive: '#8ad4ff', emissiveIntensity: 1.2, transparent: true, opacity: 0.5 }),
  wind: std({
    color: '#ffffff',
    emissive: '#fff4d0',
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
};

export const legoMats = [M.legoRed, M.legoBlue, M.legoYellow, M.legoGreen];
export const bookMats = [M.bookA, M.bookB, M.bookC];
