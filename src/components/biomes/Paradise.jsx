import { useMemo } from 'react';
import { M } from '../level/materials';
import { Solid, WindColumn, DissolvingCloud } from '../level/pieces';
import { mulberry32 } from '../../utils/rng';

// BIOME 4 — LE PARADIS (285 → 372 m)
// Lumière, silence, blanc/or/pastel. Nuages solides, colonnes de lumière,
// courants ascendants, plateformes qui se dissolvent. Gravité réduite
// dans les derniers mètres (gérée par le contrôleur).

export function ParadisePiece({ el }) {
  const [w, h, d] = el.size;

  if (el.kind === 'wind') return <WindColumn el={el} />;
  if (el.dissolve) return <DissolvingCloud el={el} />;

  if (el.kind === 'platform') {
    // nuage solide stylisé
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={M.cloud} scale={[1, h / w, 1]}>
          <sphereGeometry args={[w / 2 + 0.3, 14, 10]} />
        </mesh>
        <mesh material={M.cloud} position={[w * 0.32, -0.1, d * 0.2]} scale={[0.65, 0.4, 0.65]}>
          <sphereGeometry args={[w / 2, 10, 8]} />
        </mesh>
        <mesh material={M.cloud} position={[-w * 0.3, -0.05, -d * 0.18]} scale={[0.55, 0.38, 0.55]}>
          <sphereGeometry args={[w / 2, 10, 8]} />
        </mesh>
      </Solid>
    );
  }

  // pillar — colonne de lumière (ou fragment de marbre)
  if (el.i % 2 === 0 && !el.final) {
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={M.marble}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        <mesh position={[0, h / 2 + 0.06, 0]} material={M.gold}>
          <boxGeometry args={[w * 1.15, 0.14, d * 1.15]} />
        </mesh>
        <mesh position={[0, -h / 2 - 0.06, 0]} material={M.gold}>
          <boxGeometry args={[w * 1.15, 0.14, d * 1.15]} />
        </mesh>
      </Solid>
    );
  }
  return (
    <Solid el={el}>
      <mesh material={M.lightColumn}>
        <cylinderGeometry args={[w / 2, w / 2 + 0.15, h, 12]} />
      </mesh>
    </Solid>
  );
}

export function ParadiseDecor() {
  const fragments = useMemo(() => {
    const rng = mulberry32(777);
    return Array.from({ length: 18 }, () => {
      const a = rng() * Math.PI * 2;
      const r = 17 + rng() * 12;
      return {
        pos: [Math.cos(a) * r, 292 + rng() * 85, Math.sin(a) * r],
        rot: [rng() * 0.6 - 0.3, rng() * Math.PI, rng() * 0.6 - 0.3],
        size: [1 + rng() * 3, 0.4 + rng() * 4, 1 + rng() * 2],
        gold: rng() < 0.25,
      };
    });
  }, []);

  return (
    <group>
      {/* fragments architecturaux flottants */}
      {fragments.map((f, k) => (
        <mesh key={k} position={f.pos} rotation={f.rot} material={f.gold ? M.gold : M.marble}>
          <boxGeometry args={f.size} />
        </mesh>
      ))}
      {/* le "soleil" au-dessus de l'arrivée */}
      <mesh position={[0, 400, 0]}>
        <sphereGeometry args={[7, 20, 16]} />
        <meshBasicMaterial color="#fff6dc" />
      </mesh>
      <pointLight position={[0, 396, 0]} color="#fff0c8" intensity={400} distance={120} decay={1.6} />
    </group>
  );
}
