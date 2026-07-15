import { useMemo } from 'react';
import * as THREE from 'three';
import { M } from '../components/level/materials';
import { B, Cyl, Ladder, Trampoline, Elevator, Gate, Souvenir, StairsRun, WindColumn } from '../level/kit';
import { postitTexture } from '../utils/textures';
import { mulberry32 } from '../utils/rng';

// ============================================================
// CHAPITRE 3 — LE BUREAU (jour blanc, 150 → 230 m)
// Un open space suspendu dans le ciel, trois étages :
//  rez-de-chaussée : labyrinthe de cubicles (étroit, répétitif)
//  F1 : les serveurs (couloir étroit + échelles de maintenance)
//  F2 : le bureau du boss, la plante qui n'a jamais cessé de pousser
//  F3 : la cabine d'ascenseur brisée, et le courant d'air chaud
// Montées : ascenseur, échafaudage, chaise de bureau-trampoline (!),
// escalier de secours, colonne de clim. Plusieurs chemins, toujours.
// ============================================================

const postits = [
  ['Réunion 9h :\npréparer la\nréunion de 10h', '#ffe066'],
  ['ça marche\nsur MA\nmachine', '#a8e6a1'],
  ['On monte.\nMais vers\nquoi ?', '#ffb3c1'],
].map(
  ([t, c]) =>
    new THREE.MeshStandardMaterial({ map: postitTexture(t, c), roughness: 0.9 })
);

// Bureau avec écran (allumé ou non) et clavier
function Desk({ pos, yaw = 0, screen = 'chart' }) {
  const screenMat = { chart: M.screen, sheet: M.screenSheet, '404': M.screen404, off: M.screenOff }[screen];
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <B pos={[0, 1.5, 0]} size={[5, 0.4, 2.6]} mat={M.officeGray} />
      {[-2.2, 2.2].map((x) => (
        <B key={x} pos={[x, 0.65, 0]} size={[0.3, 1.3, 2.2]} mat={M.officeDark} />
      ))}
      <mesh position={[0.6, 2.5, -0.5]} material={M.officeDark} castShadow>
        <boxGeometry args={[2, 1.4, 0.15]} />
      </mesh>
      <mesh position={[0.6, 2.5, -0.41]} material={screenMat}>
        <planeGeometry args={[1.8, 1.2]} />
      </mesh>
      <mesh position={[0.3, 1.75, 0.5]} rotation={[-0.1, 0.1, 0]} material={M.keyboard}>
        <boxGeometry args={[1.6, 0.1, 0.7]} />
      </mesh>
      <mesh position={[-1.6, 1.95, 0.2]} material={M.mug}>
        <cylinderGeometry args={[0.22, 0.18, 0.5, 10]} />
      </mesh>
    </group>
  );
}

// Chaise de bureau à roulettes — le trampoline qui couine
function ChairTrampoline({ pos, power }) {
  return (
    <Trampoline pos={pos} size={[3, 0.8, 3]} power={power} mat={M.legoBlue}>
      <group>
        <mesh castShadow material={M.officeDark}>
          <boxGeometry args={[3, 0.7, 3]} />
        </mesh>
        <mesh position={[0, 1.6, -1.3]} castShadow material={M.officeDark}>
          <boxGeometry args={[2.8, 2.6, 0.4]} />
        </mesh>
        <mesh position={[0, -1.2, 0]} material={M.metal}>
          <cylinderGeometry args={[0.18, 0.18, 1.8, 8]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[Math.cos((i * Math.PI * 2) / 5) * 1.1, -2, Math.sin((i * Math.PI * 2) / 5) * 1.1]}
            material={M.metal}
          >
            <sphereGeometry args={[0.25, 8, 8]} />
          </mesh>
        ))}
      </group>
    </Trampoline>
  );
}

// Feuille de la plante géante
function Leaf({ pos, yaw = 0 }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <B pos={[0, 0, 0]} size={[3.6, 0.4, 3]} mat={M.plant} />
      <mesh position={[0, 0.25, 0]} material={M.plant}>
        <coneGeometry args={[1.6, 0.5, 4]} />
      </mesh>
    </group>
  );
}

export function OfficeWorld() {
  // le labyrinthe de cubicles : segments [x, z, longueur, vertical?]
  const maze = useMemo(
    () => [
      [-44, -30, 24, false],
      [-44, -14, 32, false],
      [-30, -46, 20, true],
      [-20, -38, 16, false],
      [-12, -30, 20, true],
      [-36, -22, 12, true],
      [-28, -34, 10, false],
      [-4, -42, 14, false],
      [-4, -20, 12, true],
      [8, -34, 18, true],
    ],
    []
  );

  const papers = useMemo(() => {
    const rng = mulberry32(606);
    return Array.from({ length: 22 }, () => ({
      pos: [10 + rng() * 10, 152.06 + rng() * 0.03, 18 + rng() * 10],
      rot: rng() * Math.PI,
    }));
  }, []);

  return (
    <group>
      {/* ------------------------------------------------ la dalle moquette */}
      <B pos={[-10, 151, -20]} size={[110, 2, 110]} mat={M.carpet} shadow={false} />

      {/* ------------------------------------------------ LE LABYRINTHE DE CUBICLES */}
      {maze.map(([x, z, len, vert], k) => (
        <B
          key={k}
          pos={[x, 153.3, z]}
          size={vert ? [0.5, 2.6, len] : [len, 2.6, 0.5]}
          mat={M.cubicle}
        />
      ))}
      {/* postes de travail dans le labyrinthe */}
      <Desk pos={[-38, 152, -26]} yaw={0.2} screen="sheet" />
      <Desk pos={[-24, 152, -42]} yaw={-1.4} screen="404" />
      <Desk pos={[-8, 152, -26]} yaw={2.8} screen="off" />
      <Desk pos={[-34, 152, -40]} yaw={1.2} screen="chart" />
      {/* le badge perdu, au fond d'une impasse */}
      <Souvenir id="badge" pos={[-32, 153.4, -34]} />
      {/* post-its sur les cloisons */}
      {postits.map((mat, k) => (
        <mesh key={k} position={[-44.7, 153.6 + k * 0.9 - 0.9, -26 + k * 4]} rotation={[0, Math.PI / 2, 0.06 * (k - 1)]} material={mat}>
          <planeGeometry args={[1.6, 1.6]} />
        </mesh>
      ))}

      {/* ------------------------------------------------ vie du plateau */}
      {/* machine à café géante */}
      <group position={[24, 152, 16]}>
        <B pos={[0, 4, 0]} size={[6, 8, 4]} mat={M.officeDark} />
        <mesh position={[0, 5.5, 2.05]} material={M.screen}>
          <planeGeometry args={[3, 2]} />
        </mesh>
        <Cyl pos={[0, 1, 2.8]} r={0.8} h={1.6} mat={M.mattress} />
        <pointLight position={[0, 6, 3]} color="#cfe8ff" intensity={12} distance={14} />
      </group>
      {/* photocopieuse + feuilles éparpillées (bourrage papier légendaire) */}
      <B pos={[14, 153.1, 22]} size={[5, 2.2, 3.4]} mat={M.officeGray} />
      {papers.map((p, k) => (
        <mesh key={k} position={p.pos} rotation={[-Math.PI / 2, 0, p.rot]} material={M.pages}>
          <planeGeometry args={[1.4, 2]} />
        </mesh>
      ))}
      {/* fontaine à eau */}
      <group position={[2, 152, 14]}>
        <B pos={[0, 1.4, 0]} size={[1.4, 2.8, 1.4]} mat={M.cubicleTrim} />
        <mesh position={[0, 3.4, 0]} material={M.bic}>
          <cylinderGeometry args={[0.8, 0.8, 1.4, 12]} />
        </mesh>
      </group>
      {/* cartons d'archives ("affaires de Gérard") */}
      <B pos={[-34, 153, 12]} size={[4, 2, 3]} mat={M.deskTop} />
      <B pos={[-33, 154.8, 11.4]} size={[3.4, 1.6, 2.6]} mat={M.deskTop} rot={0.2} />
      <B pos={[-38, 152.9, 16]} size={[3.6, 1.8, 2.8]} mat={M.deskTop} rot={-0.3} />

      {/* ------------------------------------------------ MONTÉES VERS F1 */}
      {/* a. l'ascenseur de verre (est) */}
      <Elevator from={[30, 153.6, -2]} to={[30, 171.3, -2]} size={[4, 0.6, 4]} period={5.5} dwell={1.8} mat={M.cubicleTrim} />
      <B pos={[30, 152.6, 4]} size={[5, 1.2, 5]} mat={M.metal} />
      {/* b. l'échafaudage (ouest) : escalier + deux plateformes + échelles */}
      <StairsRun pos={[-52, 152, 0]} yaw={0} steps={8} stepW={3.4} stepH={0.55} stepD={1.1} mat={M.metal} />
      <B pos={[-52, 156.6, -10.4]} size={[5, 0.8, 5]} mat={M.metal} />
      <Ladder pos={[-52, 157, -15.2]} height={6.4} yaw={0} style="metal" />
      <B pos={[-52, 163, -18]} size={[5, 0.8, 5]} mat={M.metal} />
      <Ladder pos={[-45.4, 163.4, -18]} height={8.8} yaw={-Math.PI / 2} style="metal" />
      {/* c. la pile de cartons + chaise-trampoline (raccourci risqué) */}
      <B pos={[-38, 153.8, 6]} size={[4, 3.6, 4]} mat={M.deskTop} />
      <ChairTrampoline pos={[-38, 157, 6]} power={30} />

      {/* ------------------------------------------------ F1 : LES SERVEURS (172) */}
      <B pos={[-10, 171, -20]} size={[70, 2, 60]} mat={M.officeGray} shadow={false} />
      {/* colonnes porteuses */}
      {[
        [-40, -44],
        [20, -44],
        [-40, 4],
        [20, 4],
      ].map(([x, z], k) => (
        <Cyl key={k} pos={[x, 161.5, z]} r={2} h={19} mat={M.officeDark} />
      ))}
      {/* plafonniers suspendus sous F1 */}
      {[-30, -10, 10].map((x, k) => (
        <group key={k} position={[x, 168, -20]}>
          <mesh material={M.neon}>
            <boxGeometry args={[6, 0.15, 0.5]} />
          </mesh>
        </group>
      ))}
      {/* les baies de serveurs : couloir étroit entre les racks */}
      <B pos={[-14, 176, 0]} size={[16, 8, 3]} mat={M.serverRack} />
      <B pos={[-14, 176, 5]} size={[16, 8, 3]} mat={M.serverRack} />
      {/* LEDs des serveurs */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[-20 + i * 2.6, 174 + (i % 3), -1.4]} material={M.serverLed}>
          <boxGeometry args={[0.5, 0.1, 0.05]} />
        </mesh>
      ))}
      {/* échelles de maintenance : rack2 → rack1 → F2 */}
      <Ladder pos={[-18, 172.2, 6.9]} height={8.2} yaw={0} style="metal" />
      <Ladder pos={[-8, 180, -3.6]} height={12.2} yaw={0} style="metal" />
      {/* bureaux de F1 */}
      <Desk pos={[6, 172, -34]} yaw={0.4} screen="chart" />
      <Desk pos={[-2, 172, -40]} yaw={-2.6} screen="sheet" />
      <Desk pos={[-30, 172, -38]} yaw={1.8} screen="404" />
      {/* d. la colonne de clim : F1 → F2, en sautant dans le vide */}
      <WindColumn pos={[29, 172, -26]} height={23} radius={2} />

      {/* ------------------------------------------------ F2 : LE BOSS + LA PLANTE (192) */}
      <B pos={[0, 191, -26]} size={[50, 2, 44]} mat={M.officeGray} shadow={false} />
      {/* le bureau du boss : six écrans */}
      <group position={[14, 192, -40]}>
        <B pos={[0, 1.6, 0]} size={[7, 0.5, 3]} mat={M.woodDark} />
        {[0, 1, 2].map((i) => (
          <group key={i}>
            <mesh position={[-2.4 + i * 2.4, 3, -1]} material={M.officeDark} castShadow>
              <boxGeometry args={[2.2, 1.5, 0.15]} />
            </mesh>
            <mesh position={[-2.4 + i * 2.4, 3, -0.91]} material={i === 1 ? M.screen404 : M.screenSheet}>
              <planeGeometry args={[2, 1.3]} />
            </mesh>
            <mesh position={[-2.4 + i * 2.4, 4.6, -1]} material={M.officeDark} castShadow>
              <boxGeometry args={[2.2, 1.5, 0.15]} />
            </mesh>
            <mesh position={[-2.4 + i * 2.4, 4.6, -0.91]} material={i === 1 ? M.screen : M.screenOff}>
              <planeGeometry args={[2, 1.3]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* la plante géante qui monte vers F3 */}
      <group position={[-23, 192, -44]}>
        <Cyl pos={[0, 1.6, 0]} r={2.6} h={3.2} rTop={2.2} mat={M.plantPot} />
        <mesh position={[-4, 12, 8]} rotation={[0.3, 0, -0.25]} material={M.plant} castShadow>
          <cylinderGeometry args={[0.5, 0.9, 22, 8]} />
        </mesh>
      </group>
      <Leaf pos={[-28, 195.6, -40]} yaw={0.4} />
      <Leaf pos={[-33, 197.8, -36]} yaw={-0.6} />
      <Leaf pos={[-29, 200, -32]} yaw={1.2} />
      <Leaf pos={[-34, 202.2, -28]} yaw={0.2} />
      <Leaf pos={[-30, 204.4, -24]} yaw={-1.1} />
      <Leaf pos={[-35, 206.6, -20]} yaw={0.8} />
      <Leaf pos={[-31, 208.8, -16]} yaw={-0.4} />
      <Leaf pos={[-35, 211.2, -12]} yaw={0.5} />
      {/* le pont de câbles vers le ticket perdu (vertige garanti) */}
      <B pos={[0, 191.8, -53]} size={[1.1, 0.4, 12]} mat={M.officeDark} />
      <B pos={[0, 191.6, -61]} size={[4, 0.8, 4]} mat={M.metal} />
      <Souvenir id="ticket" pos={[0, 193.4, -61]} />
      {/* escalier de secours F2 → F3 */}
      <StairsRun pos={[20, 192, -24]} yaw={0} steps={8} stepW={3.2} stepH={0.55} stepD={1.1} mat={M.metal} />
      <B pos={[20, 196.6, -34.4]} size={[3.4, 0.7, 3]} mat={M.metal} />
      <StairsRun pos={[16, 196.6, -34]} yaw={Math.PI} steps={8} stepW={3.2} stepH={0.55} stepD={1.1} mat={M.metal} />
      <B pos={[11, 200.9, -25]} size={[8, 0.7, 4]} mat={M.metal} />
      <Ladder pos={[4.4, 201, -23]} height={11.2} yaw={Math.PI / 2} style="metal" />

      {/* ------------------------------------------------ F3 : LE TOIT (212) */}
      <B pos={[-14, 211, -20]} size={[36, 2, 30]} mat={M.officeGray} shadow={false} />
      {/* la cabine d'ascenseur brisée */}
      <B pos={[-14, 215.5, -20]} size={[9, 7, 9]} mat={M.metal} />
      <mesh position={[-11.8, 215, -15.4]} material={M.officeDark}>
        <boxGeometry args={[3.4, 6, 0.3]} />
      </mesh>
      <mesh position={[-17, 215, -15.4]} rotation={[0, 0.5, 0]} material={M.officeDark}>
        <boxGeometry args={[3.4, 6, 0.3]} />
      </mesh>
      {/* câbles arrachés */}
      {[-16, -14, -12].map((x, k) => (
        <mesh key={k} position={[x, 222 + k, -20]} rotation={[0.2 * (k - 1), 0, 0.15 * k]} material={M.officeDark}>
          <cylinderGeometry args={[0.08, 0.08, 6 + k * 2, 6]} />
        </mesh>
      ))}
      <Ladder pos={[-14, 212.5, -15.1]} height={6.7} yaw={0} style="metal" />
      {/* le courant d'air chaud : dernier ascenseur, naturel celui-là.
          Il est au large du bord nord de F3 : on saute dans le vide,
          le courant nous cueille et nous dépose sur l'île du paradis. */}
      <WindColumn pos={[-14, 202, -44]} height={36} radius={2.6} />

      {/* ------------------------------------------------ l'arrivée : la porte du chapitre */}
      <Gate pos={[-14, 236, -14]} killY={190} label="Le Paradis" beaconHeight={40} />
    </group>
  );
}
