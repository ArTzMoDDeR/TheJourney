import { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { M } from '../components/level/materials';
import { B, Cyl, Ladder, Trampoline, Elevator, Gate, Souvenir, StairsRun } from '../level/kit';
import { hopscotchTexture, postitTexture, clockTexture } from '../utils/textures';

// ============================================================
// CHAPITRE 2 — L'ÉCOLE (aube, 70 → 150 m)
// Une cour de récré flottante au-dessus de la chambre :
//  A — le matelas de gym → le préau → le panier de basket →
//      la corniche étroite de la façade → la gouttière → le toit
//  B — l'escalier de secours (on court !) → le toit
//  C — les espaliers du gymnase → la poutre d'équilibre → le toit
// Puis : couloirs de casiers, tour de l'horloge (bloquée à 15h59),
// passerelle vertigineuse, monte-charge vers le bureau.
// ============================================================

const dawnWindow = new THREE.MeshStandardMaterial({
  color: '#2a3555',
  emissive: '#ffd9a0',
  emissiveIntensity: 0.55,
  roughness: 0.4,
});
const marelleMat = new THREE.MeshStandardMaterial({
  map: hopscotchTexture(),
  transparent: true,
  roughness: 0.9,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});
const towerClockMat = new THREE.MeshStandardMaterial({
  map: clockTexture(3, 59),
  roughness: 0.5,
  emissive: '#443311',
  emissiveIntensity: 0.4,
});
const boardMat = new THREE.MeshStandardMaterial({
  map: postitTexture('LA SONNERIE\nEST CASSÉE.\nPROFITEZ.', '#2e4a3a'),
  roughness: 0.85,
});

function ShadowKid({ pos, s = 1 }) {
  return (
    <group position={pos} scale={[s, s, s]}>
      <mesh material={M.shadowPerson}>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
      </mesh>
      <mesh position={[0, 1.15, 0]} material={M.shadowPerson}>
        <sphereGeometry args={[0.3, 8, 8]} />
      </mesh>
    </group>
  );
}

export function SchoolWorld() {
  const windows = useMemo(() => {
    const arr = [];
    for (let x = -54; x <= -10; x += 8) {
      for (const y of [79, 88]) arr.push([x, y]);
    }
    return arr;
  }, []);

  return (
    <group>
      {/* ------------------------------------------------ la dalle de la cour */}
      <B pos={[0, 71, -19]} size={[130, 2, 130]} mat={M.officeGray} shadow={false} />
      {/* marelle peinte */}
      <mesh position={[14, 72.07, 18]} rotation={[-Math.PI / 2, 0, 0.2]} material={marelleMat}>
        <planeGeometry args={[10, 20]} />
      </mesh>
      {/* muret au bord sud */}
      <B pos={[0, 73, 45.4]} size={[130, 2.4, 1.2]} mat={M.brick} />

      {/* ------------------------------------------------ LE BÂTIMENT (briques) */}
      <B pos={[-32, 84, -62]} size={[56, 24, 36]} mat={M.brick} />
      {/* fenêtres allumées à l'aube */}
      {windows.map(([x, y], k) => (
        <mesh key={k} position={[x, y, -43.85]} material={dawnWindow}>
          <planeGeometry args={[4.2, 5]} />
        </mesh>
      ))}
      {/* porte géante + file d'ombres d'élèves */}
      <B pos={[-40, 76.5, -43.6]} size={[7, 9, 0.8]} mat={M.woodDark} />
      {[0, 1, 2, 3].map((i) => (
        <ShadowKid key={i} pos={[-37 + i * 2.6, 73.4, -40 - i * 1.4]} s={0.9 + (i % 2) * 0.2} />
      ))}
      {/* corniches étroites — on y court en longeant la façade */}
      <B pos={[-32, 80.35, -43.3]} size={[56, 0.7, 1.4]} mat={M.officeGray} />
      <B pos={[-32, 88.35, -43.3]} size={[56, 0.7, 1.4]} mat={M.officeGray} />
      {/* climatiseurs : marches de la corniche basse vers la haute */}
      <B pos={[-20, 81.9, -42.5]} size={[4, 2.2, 2.2]} mat={M.metal} />
      <B pos={[-14, 84, -42.5]} size={[4, 2.1, 2.2]} mat={M.metal} />
      <B pos={[-8.5, 86.2, -42.5]} size={[4, 2.1, 2.2]} mat={M.metal} />
      <Souvenir id="image" pos={[-52, 89.9, -43.3]} />
      {/* gouttière : la corniche basse mène à l'échelle du toit */}
      <Ladder pos={[-56, 80.7, -43.5]} height={15.3} yaw={Math.PI} style="metal" />
      {/* horloge de la façade */}
      <group position={[-32, 92.5, -43.6]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={towerClockMat}>
          <cylinderGeometry args={[2.6, 2.6, 0.5, 24]} />
        </mesh>
      </group>

      {/* ------------------------------------------------ LE PRÉAU + matelas */}
      {[
        [-40, -32],
        [-40, -16],
        [-16, -32],
        [-16, -16],
      ].map(([x, z], k) => (
        <B key={k} pos={[x, 76.5, z]} size={[1.4, 9, 1.4]} mat={M.metal} />
      ))}
      <B pos={[-28, 81.2, -24]} size={[28, 1.2, 20]} mat={M.lockerDark} />
      {/* tableau du préau */}
      <mesh position={[-28, 77.5, -33.2]} material={boardMat}>
        <boxGeometry args={[10, 5, 0.4]} />
      </mesh>
      <Souvenir id="bille" pos={[-36, 73.5, -22]} />
      {/* le matelas de gym : bond vers le toit du préau */}
      <Trampoline pos={[-28, 73.7, -2]} size={[10, 1.4, 10]} power={22} mat={M.legoBlue} />

      {/* panier de basket sur la façade */}
      <mesh position={[-26, 80.5, -44]} material={M.mattress}>
        <boxGeometry args={[5, 4, 0.4]} />
      </mesh>
      <Cyl pos={[-26, 78, -41.6]} r={1.7} h={0.5} mat={M.legoRed} />
      <mesh position={[-26, 76.9, -41.6]} material={M.fence}>
        <coneGeometry args={[1.6, 1.8, 10, 1, true]} />
      </mesh>

      {/* ------------------------------------------------ LE GYMNASE (est) */}
      <B pos={[42, 82, -38]} size={[40, 20, 44]} mat={M.locker} />
      {/* espaliers (barres de gym = échelles murales) */}
      <Ladder pos={[32, 72.5, -15.6]} height={19.2} yaw={0} style="gym" width={1.6} />
      <Ladder pos={[50, 72.5, -15.6]} height={19.2} yaw={0} style="gym" width={1.6} />
      {/* sur le toit du gym : escalier puis longue poutre d'équilibre */}
      <StairsRun pos={[30, 92, -46]} yaw={Math.PI / 2} steps={7} stepW={3.4} stepH={0.57} stepD={1.1} mat={M.metal} />
      <B pos={[9, 95.75, -46]} size={[28, 0.7, 2.2]} mat={M.deskTop} />
      <B pos={[9, 84, -46]} size={[1.2, 23, 1.2]} mat={M.metal} />

      {/* ------------------------------------------------ ESCALIER DE SECOURS (est du bâtiment) */}
      <StairsRun pos={[4, 72, -46]} yaw={0} steps={8} stepW={3.2} stepH={0.55} stepD={1.1} mat={M.metal} />
      <B pos={[4, 76.6, -56.4]} size={[3.4, 0.7, 3]} mat={M.metal} />
      <StairsRun pos={[7.5, 76.6, -56]} yaw={Math.PI} steps={8} stepW={3.2} stepH={0.55} stepD={1.1} mat={M.metal} />
      <B pos={[7.5, 81.2, -45.6]} size={[3.4, 0.7, 3]} mat={M.metal} />
      <StairsRun pos={[4, 81.2, -46]} yaw={0} steps={8} stepW={3.2} stepH={0.55} stepD={1.1} mat={M.metal} />
      <B pos={[4, 85.8, -56.4]} size={[3.4, 0.7, 3]} mat={M.metal} />
      <StairsRun pos={[7.5, 85.8, -56]} yaw={Math.PI} steps={8} stepW={3.2} stepH={0.55} stepD={1.1} mat={M.metal} />
      <B pos={[7.5, 90.4, -45.6]} size={[3.4, 0.7, 3]} mat={M.metal} />
      {/* petit pont vers l'échelle du toit */}
      <B pos={[1.5, 90.55, -48]} size={[7, 0.6, 3]} mat={M.metal} />
      <Ladder pos={[-3.6, 90.7, -50]} height={5.6} yaw={Math.PI / 2} style="metal" />

      {/* ------------------------------------------------ LE TOIT : couloirs de casiers */}
      <B pos={[-40, 99, -70.5]} size={[26, 6, 3]} mat={M.locker} />
      <B pos={[-40, 99, -64.7]} size={[26, 6, 3]} mat={M.locker} />
      <B pos={[-16, 99, -60]} size={[3, 6, 16]} mat={M.locker} />
      <B pos={[-21.8, 99, -60]} size={[3, 6, 16]} mat={M.locker} />
      {/* cheminée + globe oublié */}
      <B pos={[-8, 98.5, -74]} size={[4, 5, 4]} mat={M.brick} />
      <Cyl pos={[-30, 97.6, -52]} r={1.6} h={2.8} mat={M.globeSea} />

      {/* ------------------------------------------------ LA TOUR DE L'HORLOGE */}
      <B pos={[-54, 84, -74]} size={[16, 24, 16]} mat={M.brick} />
      <B pos={[-54, 106, -74]} size={[12, 20, 12]} mat={M.brick} />
      <B pos={[-54, 126, -74]} size={[9, 20, 9]} mat={M.brick} />
      {/* cadran de la tour */}
      <group position={[-54, 130, -69.2]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={towerClockMat}>
          <cylinderGeometry args={[3, 3, 0.4, 24]} />
        </mesh>
      </group>
      {/* cloche + flèche décalée (la plateforme du sommet reste praticable) */}
      <mesh position={[-57, 137.4, -77]} material={M.lockerDark} castShadow>
        <coneGeometry args={[2.2, 4.5, 4]} />
      </mesh>
      <mesh position={[-51, 137, -71]} material={M.gold} castShadow>
        <coneGeometry args={[1.3, 2.2, 12, 1, true]} />
      </mesh>
      {/* échelles de la tour */}
      <Ladder pos={[-54, 96.5, -67.6]} height={19.7} yaw={Math.PI} style="metal" />
      <Ladder pos={[-54, 116.4, -69.1]} height={19.8} yaw={Math.PI} style="metal" />

      {/* ------------------------------------------------ PASSERELLE + MONTE-CHARGE */}
      <B pos={[-64, 136, -74]} size={[14, 0.5, 2.2]} mat={M.deskTop} />
      <B pos={[-70, 135.8, -71]} size={[6, 1, 14]} mat={M.metal} />
      <Elevator
        from={[-69, 137.2, -61.5]}
        to={[-69, 152.9, -61.5]}
        size={[4, 0.6, 4]}
        period={5}
        dwell={1.8}
        mat={M.metal}
      />
      {/* panneau du quai */}
      <mesh position={[-72.6, 138.6, -71]} rotation={[0, Math.PI / 2, 0]} material={boardMat}>
        <boxGeometry args={[3.4, 2.2, 0.3]} />
      </mesh>

      {/* ------------------------------------------------ vie de cour */}
      {[
        [4, 30, 0.4],
        [26, 8, -0.3],
      ].map(([x, z, r], k) => (
        <group key={k} position={[x, 72, z]} rotation={[0, r, 0]}>
          <B pos={[0, 1.2, 0]} size={[10, 0.6, 2.6]} mat={M.deskTop} />
          {[-4, 4].map((sx) => (
            <B key={sx} pos={[sx, 0.5, 0]} size={[0.8, 1, 2.2]} mat={M.metal} />
          ))}
        </group>
      ))}
      {/* ballon rouge */}
      <RigidBody type="fixed" colliders={false} position={[0, 73.6, 26]}>
        <CuboidCollider args={[1.2, 1.2, 1.2]} friction={1} />
        <mesh castShadow material={M.legoRed}>
          <sphereGeometry args={[1.6, 16, 12]} />
        </mesh>
      </RigidBody>
      {/* cartable géant oublié */}
      <group position={[38, 72, 30]} rotation={[0, -0.5, 0]}>
        <B pos={[0, 2.2, 0]} size={[9, 4.4, 3.6]} mat={M.legoBlue} />
        <B pos={[0, 4.7, -0.6]} size={[9, 0.9, 2.4]} mat={M.legoRed} />
        <mesh position={[0, 2.4, 1.9]} material={M.legoYellow}>
          <boxGeometry args={[4, 2.6, 0.3]} />
        </mesh>
      </group>
      {/* lampadaires encore allumés */}
      {[
        [-6, 14],
        [30, -30],
      ].map(([x, z], k) => (
        <group key={k} position={[x, 72, z]}>
          <Cyl pos={[0, 4.5, 0]} r={0.35} h={9} mat={M.metal} />
          <mesh position={[0, 9.3, 0]} material={M.neon}>
            <sphereGeometry args={[0.8, 10, 8]} />
          </mesh>
          <pointLight position={[0, 9, 0]} color="#ffe9c0" intensity={35} distance={26} decay={1.9} />
        </group>
      ))}

      {/* ------------------------------------------------ sortie du chapitre */}
      <Gate pos={[-60, 154.8, -60]} killY={110} label="Le Bureau" beaconHeight={45} />
    </group>
  );
}
