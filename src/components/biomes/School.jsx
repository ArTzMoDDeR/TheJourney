import { useMemo } from 'react';
import { M } from '../level/materials';
import { Solid, Mover } from '../level/pieces';
import { mulberry32 } from '../../utils/rng';

// BIOME 2 — L'ÉCOLE (90 → 185 m)
// Froideur, néons, verticalité rigide et grillagée : casiers, cahiers,
// tuyaux, grilles de cour. Des silhouettes d'ombre immobiles en fond.

export function SchoolPiece({ el }) {
  const [w, h, d] = el.size;

  if (el.kind === 'mover') {
    return (
      <Mover el={el}>
        <mesh castShadow receiveShadow material={M.deskTop}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        <mesh position={[0, -h, 0]} material={M.metal}>
          <boxGeometry args={[w * 0.8, h, d * 0.8]} />
        </mesh>
      </Mover>
    );
  }

  const v = el.i % 3;

  if (el.kind === 'platform') {
    if (v === 0) {
      // pile de cahiers
      return (
        <Solid el={el}>
          <mesh castShadow receiveShadow position={[0, -h * 0.25, 0]} material={M.chalkboard}>
            <boxGeometry args={[w, h * 0.5, d]} />
          </mesh>
          <mesh castShadow position={[0.15, h * 0.25, -0.1]} rotation={[0, 0.2, 0]} material={M.deskTop}>
            <boxGeometry args={[w * 0.9, h * 0.5, d * 0.9]} />
          </mesh>
        </Solid>
      );
    }
    // bureau d'écolier / rebord métallique
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={v === 1 ? M.deskTop : M.metal}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        <mesh position={[0, h / 2 + 0.02, 0]} material={M.lockerDark}>
          <boxGeometry args={[w * 1.03, 0.06, d * 1.03]} />
        </mesh>
      </Solid>
    );
  }

  // pillar
  if (v === 0) {
    // rangée de casiers métalliques
    const nDoors = Math.max(3, Math.round(h / 2.2));
    const dh = h / nDoors;
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={M.locker}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        {Array.from({ length: nDoors }, (_, k) => (
          <group key={k} position={[0, -h / 2 + dh * (k + 0.5), d / 2 + 0.03]}>
            <mesh material={M.lockerDark}>
              <boxGeometry args={[w * 0.82, dh * 0.85, 0.05]} />
            </mesh>
            {/* fentes d'aération */}
            {[0, 1].map((s) => (
              <mesh key={s} position={[0, dh * 0.2 - s * 0.25, 0.05]} material={M.metal}>
                <boxGeometry args={[w * 0.5, 0.07, 0.04]} />
              </mesh>
            ))}
          </group>
        ))}
      </Solid>
    );
  }
  if (v === 1) {
    // grille de cour (structure grillagée à grimper)
    const bars = Math.max(3, Math.round(h / 1.5));
    return (
      <Solid el={el}>
        <mesh material={M.fence}>
          <boxGeometry args={[w, h, d * 0.4]} />
        </mesh>
        {Array.from({ length: bars }, (_, k) => (
          <mesh key={k} position={[0, -h / 2 + (h / bars) * (k + 0.5), 0]} material={M.metal}>
            <boxGeometry args={[w * 1.05, 0.12, d * 0.5]} />
          </mesh>
        ))}
        {[-1, 0, 1].map((s) => (
          <mesh key={s} position={[s * w * 0.45, 0, 0]} material={M.metal}>
            <boxGeometry args={[0.12, h, d * 0.5]} />
          </mesh>
        ))}
      </Solid>
    );
  }
  // colonne de tuyaux de chauffage
  return (
    <Solid el={el}>
      <mesh castShadow receiveShadow material={M.lockerDark}>
        <boxGeometry args={[w * 0.7, h, d * 0.7]} />
      </mesh>
      {[-0.32, 0.32].map((s, k) => (
        <mesh key={k} castShadow position={[s * w, 0, d * 0.28]} material={M.metal}>
          <cylinderGeometry args={[0.22, 0.22, h, 10]} />
        </mesh>
      ))}
    </Solid>
  );
}

function ShadowPerson({ position }) {
  return (
    <group position={position}>
      <mesh material={M.shadowPerson}>
        <capsuleGeometry args={[0.32, 1.1, 4, 8]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={M.shadowPerson}>
        <sphereGeometry args={[0.24, 8, 8]} />
      </mesh>
    </group>
  );
}

export function SchoolDecor() {
  const { fences, neons, shadows } = useMemo(() => {
    const rng = mulberry32(1337);
    const fences = Array.from({ length: 14 }, () => {
      const a = rng() * Math.PI * 2;
      return {
        pos: [Math.cos(a) * 26, 100 + rng() * 75, Math.sin(a) * 26],
        yaw: -a + Math.PI / 2,
        size: [12 + rng() * 6, 10 + rng() * 8],
      };
    });
    const neons = Array.from({ length: 10 }, () => {
      const a = rng() * Math.PI * 2;
      return {
        pos: [Math.cos(a) * 15, 95 + rng() * 85, Math.sin(a) * 15],
        yaw: -a,
      };
    });
    const shadows = Array.from({ length: 6 }, () => {
      const a = rng() * Math.PI * 2;
      const r = 22 + rng() * 4;
      return {
        ledge: [Math.cos(a) * r, 96 + rng() * 80, Math.sin(a) * r],
        n: 1 + Math.floor(rng() * 3),
      };
    });
    return { fences, neons, shadows };
  }, []);

  return (
    <group>
      {/* grillages de périmètre — cage d'escalier géante */}
      {fences.map((f, k) => (
        <mesh key={k} position={f.pos} rotation={[0, f.yaw, 0]} material={M.fence}>
          <boxGeometry args={[f.size[0], f.size[1], 0.25]} />
        </mesh>
      ))}
      {/* néons froids */}
      {neons.map((n, k) => (
        <group key={k} position={n.pos} rotation={[0, n.yaw, 0]}>
          <mesh material={M.neon}>
            <boxGeometry args={[4, 0.14, 0.3]} />
          </mesh>
        </group>
      ))}
      {/* silhouettes d'ombre, purement atmosphériques */}
      {shadows.map((s, k) => (
        <group key={k}>
          <mesh position={s.ledge} material={M.lockerDark}>
            <boxGeometry args={[4, 0.4, 2.5]} />
          </mesh>
          {Array.from({ length: s.n }, (_, j) => (
            <ShadowPerson
              key={j}
              position={[s.ledge[0] + (j - s.n / 2) * 1.1, s.ledge[1] + 1.1, s.ledge[2]]}
            />
          ))}
        </group>
      ))}
      {/* tableau géant */}
      <mesh position={[24, 130, -12]} rotation={[0, -Math.PI / 3, 0]} material={M.chalkboard}>
        <boxGeometry args={[14, 8, 0.5]} />
      </mesh>
    </group>
  );
}
