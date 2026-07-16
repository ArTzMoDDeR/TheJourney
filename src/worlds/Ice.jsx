import { useMemo } from 'react';
import { M } from '../components/level/materials';
import { B, Cyl, Ramp, Ladder, Bumper, Elevator, Gate, Souvenir } from '../level/kit';
import { mulberry32 } from '../utils/rng';

// ============================================================
// CHAPITRE 3 — LA GLACE (jour pâle, 177 → 265 m)
// Un plateau polaire au-dessus de la canopée : pentes à COURIR
// (certaines gelées : ça glisse !), couloir de séracs étroit,
// arête vertigineuse, boules de neige-bumpers, télésiège final.
// Fake way : la crevasse bleue (un écho y attend). Village d'igloos.
// ============================================================

function Pine({ pos, s = 1 }) {
  return (
    <group position={pos} scale={[s, s, s]}>
      <mesh castShadow position={[0, 1, 0]} material={M.bark}>
        <cylinderGeometry args={[0.4, 0.55, 2, 8]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} castShadow position={[0, 2.6 + i * 1.7, 0]} material={M.pine}>
          <coneGeometry args={[2.4 - i * 0.6, 2.4, 9]} />
        </mesh>
      ))}
      {/* neige sur les branches */}
      <mesh position={[0, 6.6, 0]} material={M.snow}>
        <coneGeometry args={[0.7, 1, 9]} />
      </mesh>
    </group>
  );
}

function Igloo({ pos, yaw = 0 }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh castShadow material={M.snow}>
        <sphereGeometry args={[3.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh castShadow position={[0, 0.9, 3]} material={M.snow}>
        <cylinderGeometry args={[1.3, 1.3, 2.4, 10, 1, false, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

export function IceWorld() {
  const pines = useMemo(() => {
    const rng = mulberry32(909);
    return Array.from({ length: 24 }, () => ({
      pos: [-100 + rng() * 200, 177, -100 + rng() * 200],
      s: 0.8 + rng() * 1.6,
    }));
  }, []);

  return (
    <group>
      {/* ------------------------------------------------ le plateau enneigé */}
      <B pos={[0, 176, 0]} size={[220, 2, 220]} mat={M.snow} shadow={false} />
      {/* lac gelé (ça glisse !) au centre-sud */}
      <B pos={[-20, 177.05, 50]} size={[60, 0.3, 40]} mat={M.iceMat} ice />

      {/* porte du chapitre (arrivée depuis la jungle, au bord sud-ouest) */}
      <Gate pos={[-50, 179.5, -104]} killY={140} label="La Glace" beaconHeight={45} />

      {/* ------------------------------------------------ LA MONTAGNE (est) */}
      {/* rampe A : neige, on court */}
      <Ramp pos={[30, 183, -2]} size={[14, 2, 46]} pitch={0.32} mat={M.snow} />
      <B pos={[30, 189.5, -30]} size={[20, 3, 16]} mat={M.snow} />
      {/* rampe B : glace vive, presque plus d'adhérence */}
      <Ramp pos={[10, 197, -30]} size={[36, 2, 12]} pitch={0.38} yaw={Math.PI / 2} ice mat={M.iceMat} />
      <B pos={[-10, 203.5, -30]} size={[18, 3, 14]} mat={M.snow} />
      {/* le couloir des séracs (étroit) monte vers le nord */}
      <B pos={[-16.2, 210, -46]} size={[2.5, 10, 22]} mat={M.iceDeep} />
      <B pos={[-23.8, 210, -46]} size={[2.5, 10, 22]} mat={M.iceDeep} />
      <Ramp pos={[-20, 208.3, -46]} size={[4.5, 1.5, 22]} pitch={0.42} ice mat={M.iceMat} />
      <B pos={[-20, 213.5, -60]} size={[16, 3, 12]} mat={M.snow} />
      {/* stalagmites décoratives */}
      {[
        [-28, -40, 4],
        [-12, -52, 5],
        [-30, -58, 3],
      ].map(([x, z, h], k) => (
        <mesh key={k} castShadow position={[x, 215 + h / 2 - 2, z]} material={M.iceDeep}>
          <coneGeometry args={[1.2, h, 8]} />
        </mesh>
      ))}
      {/* le sérac : échelle taillée dans la glace */}
      <B pos={[-20, 223, -72]} size={[12, 16, 10]} mat={M.iceDeep} />
      <Ladder pos={[-20, 215, -66.6]} height={16.2} yaw={0} style="metal" />
      {/* l'arête : étroite, le vide des deux côtés */}
      <B pos={[-4, 231.8, -74]} size={[22, 2.2, 2.2]} mat={M.snow} />
      <B pos={[12, 233.5, -70]} size={[16, 5, 16]} mat={M.snow} />
      {/* boules de neige : bumpers vers la corniche */}
      <Bumper pos={[24, 239, -58]} r={2.4} power={17} mat={M.snow}>
        <mesh castShadow material={M.snow}>
          <sphereGeometry args={[2.4, 14, 12]} />
        </mesh>
      </Bumper>
      <B pos={[40, 243.5, -46]} size={[10, 3, 10]} mat={M.snow} />
      {/* le sommet du glacier */}
      <B pos={[50, 251.5, -50]} size={[18, 5, 16]} mat={M.snow} />
      <Ladder pos={[45, 245, -41.6]} height={9.3} yaw={0} style="metal" width={1.6} />

      {/* ------------------------------------------------ LE TÉLÉSIÈGE */}
      {/* pylônes + câble (décor) */}
      {[
        [58, -50],
        [66, -50],
      ].map(([x, z], k) => (
        <Cyl key={k} pos={[x, 258, z]} r={0.4} h={10} mat={M.metal} />
      ))}
      <mesh position={[62, 263.4, -50]} rotation={[0, 0, Math.PI / 2]} material={M.metal}>
        <cylinderGeometry args={[0.06, 0.06, 14, 4]} />
      </mesh>
      <Elevator
        from={[58, 255, -50]}
        to={[68, 264.6, -50]}
        size={[3.4, 0.5, 3.4]}
        period={4.5}
        dwell={1.6}
        mat={M.metal}
      />
      {/* la porte de l'école, posée sur sa dalle (le télésiège y dépose) */}
      <Gate pos={[58, 267.3, -50]} killY={225} label="L'École" beaconHeight={40} />

      {/* ------------------------------------------------ FAKE WAY : la crevasse */}
      {/* au bord sud du plateau, une pente de glace attirante descend…
          vers un cul-de-sac bleu suspendu dans le vide (la rampe se
          remonte en courant — ou en glissant de honte) */}
      <Ramp pos={[-52, 173.2, 117]} size={[8, 1.5, 18]} pitch={0.42} ice mat={M.iceMat} />
      <B pos={[-52, 167, 132]} size={[12, 2, 14]} mat={M.iceMat} ice />
      <B pos={[-58.5, 173, 132]} size={[2, 12, 14]} mat={M.iceDeep} />
      <B pos={[-45.5, 173, 132]} size={[2, 12, 14]} mat={M.iceDeep} />
      <B pos={[-52, 173, 140]} size={[15, 12, 2]} mat={M.iceDeep} />
      <pointLight position={[-52, 171, 133]} color="#7ac8ff" intensity={26} distance={20} decay={2} />
      <Souvenir id="écho" pos={[-52, 169.6, 134]} />

      {/* ------------------------------------------------ LE VILLAGE D'IGLOOS */}
      <Igloo pos={[-64, 177, -30]} yaw={0.6} />
      <Igloo pos={[-74, 177, -14]} yaw={-0.4} />
      <Igloo pos={[-58, 177, -8]} yaw={2.4} />
      <Souvenir id="flocon" pos={[-64, 178.6, -32]} />
      {/* bonhomme de neige */}
      <group position={[-40, 177, -20]}>
        {[
          [0, 1.1, 1.4],
          [0, 3, 1],
          [0, 4.5, 0.7],
        ].map(([x, y, r], k) => (
          <mesh key={k} castShadow position={[x, y, 0]} material={M.snow}>
            <sphereGeometry args={[r, 14, 12]} />
          </mesh>
        ))}
        <mesh position={[0, 4.5, 0.7]} rotation={[Math.PI / 2, 0, 0]} material={M.duckBeak}>
          <coneGeometry args={[0.16, 0.8, 8]} />
        </mesh>
        {[-0.25, 0.25].map((x) => (
          <mesh key={x} position={[x, 4.75, 0.55]} material={M.woodDark}>
            <sphereGeometry args={[0.08, 6, 6]} />
          </mesh>
        ))}
      </group>

      {/* sapins enneigés */}
      {pines.map((p, k) => (
        <Pine key={k} pos={p.pos} s={p.s} />
      ))}
    </group>
  );
}
