import * as THREE from 'three';
import {
  woodTexture,
  paperTexture,
  graphPaperTexture,
  brickTexture,
  fabricTexture,
  wallpaperTexture,
  metalTexture,
  carpetTexture,
  pagesTexture,
  spineTexture,
  keyboardTexture,
  clockTexture,
  screenTexture,
} from '../../utils/textures';

// Matériaux partagés (une seule instance chacun → perf), désormais texturés.
// Les surfaces grimpables gardent un léger emissive : lisibilité douce.

const std = (opts) => new THREE.MeshStandardMaterial(opts);

const woodMap = woodTexture('#9a6a3f', '#6b421f', 1);
const woodDarkMap = woodTexture('#6b4526', '#452a12', 5);
const floorMap = woodTexture('#7a5a3a', '#4e3418', 9);
floorMap.repeat.set(6, 6);
const paperMap = paperTexture();
const graphMap = graphPaperTexture();
const brickMap = brickTexture();
brickMap.repeat.set(3, 2);
const fabricMap = fabricTexture();
const mattressMap = fabricTexture('#e8e2d4', '#c9c2b0');
const rugMap = fabricTexture('#8a5a7a', '#6a4260');
rugMap.repeat.set(5, 5);
const wallpaperMap = wallpaperTexture();
const lockerMap = metalTexture('#5a7a6a', 3);
const metalMap = metalTexture('#70767e', 4);
const cabinetMap = metalTexture('#77828c', 8);
const carpetMap = carpetTexture();
const pagesMap = pagesTexture();
const keyboardMap = keyboardTexture();

export const M = {
  // — Chambre —
  wood: std({ map: woodMap, roughness: 0.8, emissive: '#3a2410', emissiveIntensity: 0.15 }),
  woodDark: std({ map: woodDarkMap, roughness: 0.85, emissive: '#2a1a0c', emissiveIntensity: 0.12 }),
  floor: std({ map: floorMap, roughness: 0.75 }),
  legoRed: std({ color: '#c0392b', roughness: 0.3, emissive: '#5a1a12', emissiveIntensity: 0.22 }),
  legoBlue: std({ color: '#2d6cdf', roughness: 0.3, emissive: '#122a5a', emissiveIntensity: 0.22 }),
  legoYellow: std({ color: '#e8b13a', roughness: 0.3, emissive: '#6a4a10', emissiveIntensity: 0.22 }),
  legoGreen: std({ color: '#3f9e4d', roughness: 0.3, emissive: '#164a1e', emissiveIntensity: 0.22 }),
  pages: std({ map: pagesMap, roughness: 0.9, emissive: '#4a4030', emissiveIntensity: 0.1 }),
  fabric: std({ map: fabricMap, roughness: 0.95, emissive: '#5a3a4c', emissiveIntensity: 0.1 }),
  mattress: std({ map: mattressMap, roughness: 0.9 }),
  rug: std({ map: rugMap, roughness: 1 }),
  wallBedroom: std({ map: wallpaperMap, roughness: 0.95 }),
  knob: std({ color: '#d8c8a8', roughness: 0.35, metalness: 0.4 }),
  crayonWood: std({ color: '#e8cf9e', roughness: 0.8 }),
  teddy: std({ color: '#a97742', roughness: 1, emissive: '#3a250e', emissiveIntensity: 0.15 }),
  teddyMuzzle: std({ color: '#d9b98a', roughness: 1 }),
  duck: std({ color: '#ffd23e', roughness: 0.4, emissive: '#7a5a00', emissiveIntensity: 0.25 }),
  duckBeak: std({ color: '#ff8c42', roughness: 0.5 }),

  // — École —
  locker: std({ map: lockerMap, roughness: 0.5, metalness: 0.35, emissive: '#1e3a2c', emissiveIntensity: 0.22 }),
  lockerDark: std({ color: '#3e5a4c', roughness: 0.55, metalness: 0.4 }),
  paper: std({ map: paperMap, roughness: 0.9, emissive: '#403c2c', emissiveIntensity: 0.12 }),
  graphPaper: std({ map: graphMap, roughness: 0.9, emissive: '#3a3a30', emissiveIntensity: 0.1 }),
  deskTop: std({ map: woodTexture('#a8926a', '#7a6844', 12), roughness: 0.6, emissive: '#3a3020', emissiveIntensity: 0.15 }),
  metal: std({ map: metalMap, roughness: 0.4, metalness: 0.55, emissive: '#22262c', emissiveIntensity: 0.15 }),
  fence: std({ color: '#3a4148', roughness: 0.6, metalness: 0.5, transparent: true, opacity: 0.75 }),
  brick: std({ map: brickMap, roughness: 0.9 }),
  chalkboard: std({ color: '#2e4a3a', roughness: 0.8 }),
  neon: std({ color: '#ffffff', emissive: '#dff2ff', emissiveIntensity: 2.2 }),
  shadowPerson: std({ color: '#0c0e14', roughness: 1, transparent: true, opacity: 0.75 }),
  clock: std({ map: clockTexture(3, 59), roughness: 0.6 }),
  globeSea: std({ color: '#3a6a9a', roughness: 0.5, emissive: '#16283c', emissiveIntensity: 0.25 }),
  globeLand: std({ color: '#6a9a5a', roughness: 0.7 }),
  bic: std({ color: '#f2f2f2', roughness: 0.3, transparent: true, opacity: 0.9 }),
  bicCap: std({ color: '#2255cc', roughness: 0.35 }),

  // — Bureau —
  officeGray: std({ color: '#8a8d93', roughness: 0.75, emissive: '#2e3034', emissiveIntensity: 0.15 }),
  officeDark: std({ color: '#55585e', roughness: 0.7, emissive: '#1e2024', emissiveIntensity: 0.12 }),
  cubicle: std({ map: carpetMap, color: '#b8bec8', roughness: 0.95, emissive: '#33363c', emissiveIntensity: 0.12 }),
  cubicleTrim: std({ color: '#c8ccd2', roughness: 0.5 }),
  cabinet: std({ map: cabinetMap, roughness: 0.45, metalness: 0.45, emissive: '#28303a', emissiveIntensity: 0.18 }),
  screen: std({ map: screenTexture('chart'), emissive: '#cfe8ff', emissiveIntensity: 0.85, emissiveMap: screenTexture('chart') }),
  screen404: std({ map: screenTexture('404'), emissive: '#cfe8ff', emissiveIntensity: 0.9, emissiveMap: screenTexture('404') }),
  screenSheet: std({ map: screenTexture('sheet'), emissive: '#cfe8ff', emissiveIntensity: 0.8, emissiveMap: screenTexture('sheet') }),
  screenOff: std({ color: '#14161a', roughness: 0.4 }),
  keyboard: std({ map: keyboardMap, roughness: 0.6 }),
  serverRack: std({ map: metalTexture('#26292e', 6), roughness: 0.5, metalness: 0.6, emissive: '#0e2a1a', emissiveIntensity: 0.35 }),
  serverLed: std({ color: '#111', emissive: '#4dff88', emissiveIntensity: 2.5 }),
  ceiling: std({ color: '#5e6167', roughness: 0.9 }),
  carpet: std({ map: carpetMap, roughness: 1 }),
  mug: std({ color: '#c0392b', roughness: 0.35, emissive: '#4a1610', emissiveIntensity: 0.2 }),
  plant: std({ color: '#3f7a3f', roughness: 0.9, emissive: '#14300f', emissiveIntensity: 0.2 }),
  plantPot: std({ color: '#a86a4a', roughness: 0.8 }),

  // — Paradis —
  cloud: std({ color: '#ffffff', roughness: 1, emissive: '#fff6e0', emissiveIntensity: 0.4 }),
  lightColumn: std({ color: '#fff2cf', roughness: 0.6, emissive: '#ffe9b0', emissiveIntensity: 1.1 }),
  gold: std({ color: '#e8c878', roughness: 0.3, metalness: 0.7, emissive: '#a87820', emissiveIntensity: 0.5 }),
  marble: std({ color: '#f2ecdc', roughness: 0.5, emissive: '#d8ccae', emissiveIntensity: 0.25 }),
  balloon: std({ color: '#e05a6a', roughness: 0.25, emissive: '#5a1620', emissiveIntensity: 0.3 }),

  // — Communs —
  core: std({ color: '#4a4550', roughness: 0.9 }),
  checkpoint: std({ color: '#fff', emissive: '#ffd98a', emissiveIntensity: 1.8, transparent: true, opacity: 0.85 }),
  checkpointDone: std({ color: '#fff', emissive: '#8ad4ff', emissiveIntensity: 1.2, transparent: true, opacity: 0.5 }),
  souvenir: std({ color: '#fff', emissive: '#ffe9a8', emissiveIntensity: 2.2, transparent: true, opacity: 0.95 }),
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

// Livres : couvertures colorées avec vrais titres sur la tranche
const BOOK_DEFS = [
  ['#a04848', 'CONTES'],
  ['#4a6a9a', 'ATLAS'],
  ['#7a9a5a', 'FABLES'],
  ['#8a5a9a', 'POÈMES'],
  ['#b08040', 'PIRATES'],
  ['#5a8a8a', 'ÉTOILES'],
];
export const bookMats = BOOK_DEFS.map(([c, t]) =>
  std({ map: spineTexture(c, t), roughness: 0.7, emissive: '#221818', emissiveIntensity: 0.2 })
);
export const bookCoverMats = BOOK_DEFS.map(([c]) =>
  std({ color: c, roughness: 0.7, emissive: '#221515', emissiveIntensity: 0.2 })
);

export const crayonMats = ['#d94f3a', '#3a7ad9', '#3aa04f', '#e8b13a', '#8a4fd9'].map((c) =>
  std({ color: c, roughness: 0.5, emissive: '#101010', emissiveIntensity: 0.15 })
);
