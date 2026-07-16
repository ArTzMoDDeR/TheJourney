import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Sky } from './Sky';
import { Ladder, Trampoline, Souvenir, FinishZone, DriftParticles } from './kit';

// ============================================================
// MONDE SIMPLE — repartir d'une base saine, 100 % boîtes pleines.
// Aucun modèle 3D (donc AUCUN mur invisible) : un grand sol plat où l'on
// marche librement, quelques plateformes à sauter, une échelle, un
// trampoline, une arrivée. On rebâtira l'habillage dessus ensuite.
// ============================================================

// couleurs simples et lisibles
const M = {
  ground: new THREE.MeshStandardMaterial({ color: '#6a9a5a', roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: '#b8b0a0', roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ color: '#a8794a', roughness: 0.85 }),
  accent: new THREE.MeshStandardMaterial({ color: '#c0603a', roughness: 0.6 }),
  pad: new THREE.MeshStandardMaterial({ color: '#5a8ad0', roughness: 0.4, emissive: '#1a3a6a', emissiveIntensity: 0.3 }),
};

// boîte solide : mesh + collider EXACTEMENT de la même taille (zéro surprise)
function Box({ pos, size, mat = M.stone }) {
  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} friction={1} />
      <mesh castShadow receiveShadow material={mat}>
        <boxGeometry args={size} />
      </mesh>
    </RigidBody>
  );
}

// plateforme : Box dont pos = centre de la SURFACE (on marche à pos.y)
function Plat({ x, y, z, w = 6, d = 6, h = 1, mat = M.stone }) {
  return <Box pos={[x, y - h / 2, z]} size={[w, h, d]} mat={mat} />;
}

// arbre décoratif simple (SANS collision) — juste pour habiller un peu
function Tree({ pos }) {
  return (
    <group position={pos}>
      <mesh castShadow material={M.wood}>
        <cylinderGeometry args={[0.4, 0.6, 3, 8]} />
      </mesh>
      <mesh castShadow position={[0, 3, 0]} material={M.ground}>
        <coneGeometry args={[2.2, 4, 9]} />
      </mesh>
    </group>
  );
}

export function World() {
  return (
    <group>
      <Sky />

      {/* ---------- LE SOL : un grand plateau plat, on marche partout ---------- */}
      <RigidBody type="fixed" colliders={false} position={[0, -1, 0]}>
        <CuboidCollider args={[80, 1, 80]} friction={1} />
        <mesh receiveShadow material={M.ground}>
          <boxGeometry args={[160, 2, 160]} />
        </mesh>
      </RigidBody>

      {/* quelques arbres décoratifs, loin du chemin (pas de collision) */}
      <Tree pos={[18, 0, 14]} />
      <Tree pos={[-22, 0, 10]} />
      <Tree pos={[24, 0, -18]} />
      <Tree pos={[-16, 0, -22]} />
      <Tree pos={[10, 0, 26]} />

      {/* ---------- UN PETIT CHEMIN QUI MONTE (sauts faciles) ---------- */}
      <Plat x={0} y={1.2} z={-8} w={5} d={5} mat={M.stone} />
      <Plat x={4} y={2.6} z={-13} w={5} d={5} mat={M.stone} />
      <Plat x={0} y={4.0} z={-18} w={5} d={5} mat={M.stone} />
      <Plat x={-4} y={5.4} z={-13} w={5} d={5} mat={M.stone} />

      {/* trampoline : rebond vers la plateforme haute */}
      <Trampoline pos={[-4, 6.0, -13]} size={[3.5, 1, 3.5]} power={16} mat={M.pad} />
      <Plat x={-4} y={11} z={-20} w={7} d={7} mat={M.stone} />
      <Souvenir id="s1" pos={[-4, 12.5, -20]} />

      {/* échelle : monte encore d'un cran vers l'arrivée */}
      <Box pos={[-4, 14.5, -24]} size={[7, 8, 1]} mat={M.wood} />
      <Ladder pos={[-4, 11, -23.4]} height={7.4} yaw={0} style="wood" />
      <Plat x={-4} y={18.5} z={-26} w={8} d={6} mat={M.stone} />

      {/* ---------- L'ARRIVÉE ---------- */}
      <group position={[-4, 18.5, -28]}>
        {[-2, 2].map((sx) => (
          <mesh key={sx} castShadow position={[sx, 2.5, 0]} material={M.accent}>
            <cylinderGeometry args={[0.25, 0.3, 5, 8]} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 5.2, 0]} material={M.accent}>
          <boxGeometry args={[5, 0.6, 0.6]} />
        </mesh>
      </group>
      <FinishZone position={[-4, 20, -28]} />

      <DriftParticles />
    </group>
  );
}
