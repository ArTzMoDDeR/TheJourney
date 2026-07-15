import { useMemo } from 'react';
import { M } from '../level/materials';
import { Solid, Mover } from '../level/pieces';
import { mulberry32 } from '../../utils/rng';

// BIOME 3 — LE BUREAU (185 → 285 m)
// Grisaille, open space infini, motifs répétitifs : classeurs, cloisons,
// écrans empilés, serveurs. Plafonds bas ponctuels, écrasement.

export function OfficePiece({ el }) {
  const [w, h, d] = el.size;

  if (el.kind === 'mover') {
    // monte-charge brinquebalant
    return (
      <Mover el={el}>
        <mesh castShadow receiveShadow material={M.metal}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        <mesh position={[0, h / 2 + 0.03, 0]} material={M.cubicleTrim}>
          <boxGeometry args={[w * 1.02, 0.06, d * 1.02]} />
        </mesh>
      </Mover>
    );
  }

  const v = el.i % 3;

  if (el.kind === 'platform') {
    if (v === 0) {
      // bureau avec écran
      return (
        <Solid el={el}>
          <mesh castShadow receiveShadow material={M.officeGray}>
            <boxGeometry args={[w, h, d]} />
          </mesh>
          <group position={[w * 0.2, h / 2 + 0.5, -d * 0.2]}>
            <mesh material={M.officeDark}>
              <boxGeometry args={[1.1, 0.8, 0.12]} />
            </mesh>
            <mesh position={[0, 0, 0.065]} material={M.screen}>
              <boxGeometry args={[0.95, 0.65, 0.02]} />
            </mesh>
          </group>
        </Solid>
      );
    }
    // classeur couché / rebord de cloison
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={v === 1 ? M.cabinet : M.cubicle}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        <mesh position={[0, h / 2 + 0.02, 0]} material={M.cubicleTrim}>
          <boxGeometry args={[w * 1.03, 0.05, d * 1.03]} />
        </mesh>
      </Solid>
    );
  }

  // pillar
  if (v === 0) {
    // colonne de classeurs à tiroirs
    const n = Math.max(4, Math.round(h / 1.2));
    const dh = h / n;
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={M.cabinet}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        {Array.from({ length: n }, (_, k) => (
          <group key={k} position={[0, -h / 2 + dh * (k + 0.5), d / 2 + 0.03]}>
            <mesh material={M.officeDark}>
              <boxGeometry args={[w * 0.85, dh * 0.72, 0.05]} />
            </mesh>
            <mesh position={[0, dh * 0.14, 0.04]} material={M.cubicleTrim}>
              <boxGeometry args={[w * 0.3, 0.07, 0.05]} />
            </mesh>
          </group>
        ))}
      </Solid>
    );
  }
  if (v === 1) {
    // baie de serveurs, LEDs clignotantes figées
    const rows = Math.max(4, Math.round(h / 1.4));
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={M.serverRack}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        {Array.from({ length: rows }, (_, k) => (
          <mesh
            key={k}
            position={[w * 0.18, -h / 2 + (h / rows) * (k + 0.5), d / 2 + 0.03]}
            material={M.serverLed}
          >
            <boxGeometry args={[0.08, 0.08, 0.03]} />
          </mesh>
        ))}
      </Solid>
    );
  }
  // pile d'écrans
  const n = Math.max(3, Math.round(h / 1.6));
  const sh = h / n;
  return (
    <Solid el={el}>
      {Array.from({ length: n }, (_, k) => (
        <group
          key={k}
          position={[0, -h / 2 + sh * (k + 0.5), 0]}
          rotation={[0, ((k % 2) - 0.5) * 0.25, 0]}
        >
          <mesh castShadow receiveShadow material={M.officeDark}>
            <boxGeometry args={[w * 0.95, sh * 0.92, d * 0.7]} />
          </mesh>
          <mesh position={[0, 0, d * 0.36]} material={k % 3 === 0 ? M.screen : M.screenOff}>
            <boxGeometry args={[w * 0.8, sh * 0.7, 0.02]} />
          </mesh>
        </group>
      ))}
    </Solid>
  );
}

export function OfficeDecor() {
  const { walls, ceilings, racks } = useMemo(() => {
    const rng = mulberry32(9001);
    const walls = Array.from({ length: 16 }, () => {
      const a = rng() * Math.PI * 2;
      return {
        pos: [Math.cos(a) * 26, 190 + rng() * 88, Math.sin(a) * 26],
        yaw: -a + Math.PI / 2,
        size: [10 + rng() * 5, 4 + rng() * 3],
      };
    });
    // plafonds bas ponctuels au-dessus de la route : écrasement
    const ceilings = Array.from({ length: 6 }, () => {
      const a = rng() * Math.PI * 2;
      return {
        pos: [Math.cos(a) * 10.5, 195 + rng() * 80, Math.sin(a) * 10.5],
        yaw: -a,
      };
    });
    const racks = Array.from({ length: 8 }, () => {
      const a = rng() * Math.PI * 2;
      return { pos: [Math.cos(a) * 19, 188 + rng() * 88, Math.sin(a) * 19], yaw: -a };
    });
    return { walls, ceilings, racks };
  }, []);

  return (
    <group>
      {walls.map((f, k) => (
        <group key={k} position={f.pos} rotation={[0, f.yaw, 0]}>
          <mesh material={M.cubicle}>
            <boxGeometry args={[f.size[0], f.size[1], 0.4]} />
          </mesh>
          <mesh position={[0, f.size[1] / 2 + 0.05, 0]} material={M.cubicleTrim}>
            <boxGeometry args={[f.size[0], 0.12, 0.5]} />
          </mesh>
        </group>
      ))}
      {ceilings.map((c, k) => (
        <group key={k} position={c.pos} rotation={[0, c.yaw, 0]}>
          <mesh material={M.ceiling}>
            <boxGeometry args={[9, 0.3, 7]} />
          </mesh>
          <mesh position={[0, -0.2, 0]} material={M.neon}>
            <boxGeometry args={[3.5, 0.08, 0.4]} />
          </mesh>
        </group>
      ))}
      {racks.map((r, k) => (
        <group key={k} position={r.pos} rotation={[0, r.yaw, 0]}>
          <mesh material={M.serverRack}>
            <boxGeometry args={[2, 6, 1.2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
