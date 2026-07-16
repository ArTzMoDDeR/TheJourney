import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

// ---------------------------------------------------------------------------
// Pont vers les vrais kits glTF déposés dans public/models/.
// Les .gltf Synty référencent leurs textures par nom nu ("T_Brick.png"),
// mais les fichiers sont dans <kit>/textures/. On redirige donc toute
// requête d'image /models/<kit>/<fichier>.png vers /models/<kit>/textures/.
// ---------------------------------------------------------------------------

let installed = false;
export function installAssetPipeline() {
  if (installed) return;
  installed = true;
  const redirect = (url) =>
    url.replace(
      /\/models\/([^/]+)\/([^/]+\.(png|jpe?g|webp))$/i,
      '/models/$1/textures/$2'
    );
  THREE.DefaultLoadingManager.setURLModifier(redirect);
}

// Catalogue des pièces réellement utilisées (clé → url). Seules celles-ci
// sont préchargées : Three met les textures partagées en cache, donc le coût
// mémoire est celui des atlas de chaque kit, pas du nombre de modèles.
const V = (f) => `/models/village/${f}.gltf`;
const D = (f) => `/models/downtown/${f}.gltf`;
const N = (f) => `/models/nature/${f}.gltf`;

export const MODELS = {
  // — sols / plateformes (toutes ~2×2, scalables) —
  floorWood: V('Floor_WoodDark'),
  floorWoodLight: V('Floor_WoodLight'),
  floorBrick: V('Floor_Brick'),
  floorStone: D('Floor_4x4'),
  floorCity: D('Floor_2x2'),
  roof: D('Roof_4x4'),
  rockPlatR: N('RockPath_Round_Wide'),
  rockPlatS: N('RockPath_Square_Wide'),

  // — structures village —
  wallPlaster: V('Wall_Plaster_Straight'),
  wallBrick: V('Wall_UnevenBrick_Straight'),
  wallWindow: V('Wall_Plaster_Window_Wide_Flat'),
  beam: V('Prop_Support'),
  crate: V('Prop_Crate'),
  wagon: V('Prop_Wagon'),
  stairs: V('Stairs_Exterior_Straight'),
  balcony: V('Balcony_Simple_Straight'),
  fence: V('Prop_WoodenFence_Single'),
  chimney: V('Prop_Chimney'),
  vine: V('Prop_Vine1'),

  // — nature —
  tree1: N('CommonTree_1'),
  tree2: N('CommonTree_5'),
  pine1: N('Pine_1'),
  pine3: N('Pine_3'),
  deadTree: N('DeadTree_2'),
  rockM1: N('Rock_Medium_1'),
  rockM2: N('Rock_Medium_2'),
  rockM3: N('Rock_Medium_3'),
  bush: N('Bush_Common'),
  fern: N('Fern_1'),
  grass: N('Grass_Common_Tall'),
  mushroom: N('Mushroom_Laetiporus'),
  flower: N('Flower_4_Group'),

  // — ville —
  buildingS: D('Building_Small_1'),
  buildingM: D('Building_Medium_2_001'),
  buildingL: D('Building_Large_2'),
  column: D('Brick_Column_Small'),
  ac: D('Prop_ACUnit'),
  bollard: D('Prop_Bollard'),
  planter: D('Prop_Planter_Single'),
};

export const CHARACTER_URL = '/models/character/Superhero_Male_FullBody.gltf';

// Précharge le personnage (le seul asset lourd du monde simple actuel).
export function preloadAll() {
  useGLTF.preload(CHARACTER_URL);
}
