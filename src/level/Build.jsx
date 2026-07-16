import { useMemo } from 'react';
import * as THREE from 'three';
import { Clone, useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { MODELS } from '../utils/assets';

// Briques de construction habillées de vrais modèles glTF.
// Le gameplay repose sur des colliders boîtes fiables ; les modèles Synty
// ne sont que l'habillage visuel par-dessus (approche robuste et perf).

// mesure (une fois) la boîte englobante d'un modèle dans ses unités propres
function useBounds(url) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const min = b.min.clone();
    b.getSize(size);
    return { scene, size, min };
  }, [scene]);
}

// ------------------------------------------------------------- Plateforme
// Sol praticable : tuiles de plancher répétées sur [w×d], collider plat.
// pos = centre de la SURFACE (on marche à pos.y).
export function Plat({ pos, size = [8, 8], model = 'floorWood', thick = 1.2, tile = 4 }) {
  const { scene, size: bs, min } = useBounds(MODELS[model]);
  const [w, d] = size;

  // grille de tuiles pour éviter d'étirer la texture
  const tiles = useMemo(() => {
    const nx = Math.max(1, Math.round(w / tile));
    const nz = Math.max(1, Math.round(d / tile));
    const tw = w / nx;
    const td = d / nz;
    const sx = tw / (bs.x || 2);
    const sz = td / (bs.z || 2);
    const arr = [];
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        arr.push({ x: -w / 2 + tw * (ix + 0.5), z: -d / 2 + td * (iz + 0.5), sx, sz });
      }
    }
    return arr;
  }, [w, d, tile, bs]);

  // la surface du sol est ~ y=0 dans le modèle : on la place à pos.y
  return (
    <group position={pos}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, thick / 2, d / 2]} position={[0, -thick / 2, 0]} friction={0.9} />
      </RigidBody>
      {tiles.map((t, i) => (
        <Clone key={i} object={scene} position={[t.x, 0, t.z]} scale={[t.sx, 1, t.sz]} castShadow receiveShadow />
      ))}
    </group>
  );
}

// ------------------------------------------------------- Objet solide
// Modèle avec collider boîte automatique (bâtiment, rocher, caisse...).
// pos = point d'appui au SOL du modèle.
export function Solid({ pos, model, scale = 1, rot = 0, collider, climbTop = false }) {
  const { scene, size, min } = useBounds(MODELS[model]);
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  const half = collider || [(size.x * s[0]) / 2, (size.y * s[1]) / 2, (size.z * s[2]) / 2];
  // le modèle est posé pieds au sol : on remonte de -min.y*scale
  const lift = -min.y * s[1];
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={half} position={[0, half[1], 0]} friction={0.9} />
      </RigidBody>
      <Clone object={scene} position={[0, lift, 0]} scale={s} castShadow receiveShadow />
    </group>
  );
}

// ------------------------------------------------------- Décoration
// Modèle sans collision (arbres, buissons, herbe, vignes, lampes).
export function Deco({ pos, model, scale = 1, rot = 0, tilt = 0 }) {
  const { scene, min } = useBounds(MODELS[model]);
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  return (
    <group position={pos} rotation={[tilt, rot, 0]}>
      <Clone object={scene} position={[0, -min.y * s[1], 0]} scale={s} castShadow receiveShadow />
    </group>
  );
}
