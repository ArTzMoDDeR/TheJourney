import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { runtime } from '../store/runtime';
import { cloudSprite, dotSprite, windowsTexture, earthTexture } from '../utils/textures';
import { mulberry32 } from '../utils/rng';

// LE MONDE AUTOUR — tout ce qui donne la sensation d'un univers infini :
// dôme de ciel (nuit → aube → jour blanc → heure dorée selon l'altitude),
// soleil, lune, étoiles, nappes de nuages, mer de nuages sous le paradis,
// ville lointaine et montagnes à l'horizon, oiseaux.
// Aucun de ces éléments n'est affecté par le fog : c'est l'arrière-plan.

// palettes du ciel par altitude [zénith, horizon]
const SKY_KEYS = [
  { y: 0, top: '#141024', bot: '#3a2a3e' }, // nuit de la chambre
  { y: 74, top: '#2a4a48', bot: '#a8c8a0' }, // matin vert de la jungle
  { y: 165, top: '#6a92b8', bot: '#dfeef8' }, // jour pâle de la glace
  { y: 262, top: '#2a3555', bot: '#c98a6a' }, // aube de l'école
  { y: 340, top: '#8a99a8', bot: '#c9ced4' }, // jour blanc du bureau
  { y: 428, top: '#04050c', bot: '#0c1020' }, // nuit noire de l'espace
  { y: 496, top: '#04050c', bot: '#141224' }, // l'espace jusqu'au seuil du paradis
  { y: 508, top: '#e8b96a', bot: '#f4e3c2' }, // heure dorée
  { y: 556, top: '#f4d9a8', bot: '#fdf6e8' }, // lumière
];

function lerpSky(y, key, out) {
  let a = SKY_KEYS[0];
  let b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (y >= SKY_KEYS[i].y && y <= SKY_KEYS[i + 1].y) {
      a = SKY_KEYS[i];
      b = SKY_KEYS[i + 1];
      break;
    }
  }
  if (y >= SKY_KEYS[SKY_KEYS.length - 1].y) a = b;
  const t = a === b ? 0 : THREE.MathUtils.clamp((y - a.y) / (b.y - a.y), 0, 1);
  return out.set(a[key]).lerp(new THREE.Color(b[key]), t);
}

export function Sky() {
  const dome = useRef();
  const stars = useRef();
  const moon = useRef();
  const sun = useRef();
  const earth = useRef();
  const aurora = useRef();

  const earthMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: earthTexture(),
        fog: false,
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const auroraMat = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const g2 = c.getContext('2d');
    const grad = g2.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(90,255,160,0)');
    grad.addColorStop(0.5, 'rgba(90,255,160,0.55)');
    grad.addColorStop(1, 'rgba(120,200,255,0)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 128, 64);
    const tex = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      fog: false,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  const domeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color('#141024') },
          uBot: { value: new THREE.Color('#3a2a3e') },
        },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uBot;
          varying vec3 vPos;
          void main() {
            float h = clamp(normalize(vPos).y * 1.4 + 0.25, 0.0, 1.0);
            h = pow(h, 0.8);
            gl_FragColor = vec4(mix(uBot, uTop, h), 1.0);
          }
        `,
      }),
    []
  );

  // étoiles (visibles la nuit en bas, retour discret au paradis)
  const starGeo = useMemo(() => {
    const rng = mulberry32(99);
    const n = 700;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const e = rng() * Math.PI * 0.48;
      const r = 780;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      pos[i * 3 + 1] = Math.sin(e) * r + 40;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const starMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: dotSprite(),
        color: '#fff6dd',
        size: 2.6,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false,
      }),
    []
  );

  // nappes de nuages (sprites)
  const { cloudGeo, cloudMat } = useMemo(() => {
    const rng = mulberry32(55);
    const n = 110;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      // toujours au large des zones de jeu (rayon > 300)
      const r = 300 + rng() * 380;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 60 + rng() * 480;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      map: cloudSprite(),
      color: '#ffffff',
      size: 130,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      fog: false,
    });
    return { cloudGeo: g, cloudMat: m };
  }, []);

  // mer de nuages sous le paradis
  const { seaGeo, seaMat } = useMemo(() => {
    const rng = mulberry32(77);
    const n = 220;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const r = 30 + rng() * 380;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 488 + rng() * 12;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      map: cloudSprite(),
      color: '#fff2dc',
      size: 170,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false,
    });
    return { seaGeo: g, seaMat: m };
  }, []);

  // ville lointaine (instancée) + montagnes : l'horizon infini
  const cityRef = useRef();
  const cityCount = 320;
  const cityMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: windowsTexture(),
        color: '#8a90a8',
        fog: false,
      }),
    []
  );
  const cityMatrices = useMemo(() => {
    const rng = mulberry32(31);
    const arr = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eu = new THREE.Euler();
    for (let i = 0; i < cityCount; i++) {
      const a = rng() * Math.PI * 2;
      const r = 260 + rng() * 320;
      const h = 18 + rng() * 85;
      const w = 14 + rng() * 26;
      eu.set(0, rng() * Math.PI, 0);
      q.setFromEuler(eu);
      m4.compose(
        new THREE.Vector3(Math.cos(a) * r, h / 2 - 55, Math.sin(a) * r),
        q,
        new THREE.Vector3(w, h, w)
      );
      arr.push(m4.clone());
    }
    return arr;
  }, []);

  const mountains = useMemo(() => {
    const rng = mulberry32(63);
    return Array.from({ length: 14 }, () => {
      const a = rng() * Math.PI * 2;
      const r = 620 + rng() * 160;
      return {
        pos: [Math.cos(a) * r, -60, Math.sin(a) * r],
        h: 180 + rng() * 220,
        w: 160 + rng() * 200,
      };
    });
  }, []);
  const mountainMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#3c3a52', fog: false }),
    []
  );

  // oiseaux — petites ailes qui battent, en cercles au-dessus de l'école
  const birds = useRef([]);
  const birdMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#1c1a28', side: THREE.DoubleSide, fog: false }),
    []
  );

  const _c = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const y = runtime.playerPos.y;
    const t = runtime.simTime;

    if (dome.current) {
      // le dôme suit le joueur : l'horizon ne se rapproche jamais
      dome.current.position.set(runtime.playerPos.x, y * 0.6, runtime.playerPos.z);
      lerpSky(y, 'top', domeMat.uniforms.uTop.value);
      lerpSky(y, 'bot', domeMat.uniforms.uBot.value);
    }
    if (stars.current) {
      // brillantes la nuit (chambre), à l'aube (école) discrètes,
      // ÉCLATANTES dans l'espace, douces au paradis
      const night = THREE.MathUtils.clamp(1 - y / 90, 0, 1);
      const space = THREE.MathUtils.clamp((y - 400) / 40, 0, 1) * THREE.MathUtils.clamp((530 - y) / 30, 0.35, 1);
      starMat.opacity = Math.max(night * 0.9, space);
      stars.current.position.set(runtime.playerPos.x, 0, runtime.playerPos.z);
    }
    if (moon.current) {
      moon.current.material.opacity = THREE.MathUtils.clamp(1 - y / 120, 0, 1);
    }
    if (sun.current) {
      const day = THREE.MathUtils.clamp((y - 60) / 80, 0, 1) * (y > 420 && y < 500 ? 0.4 : 1);
      sun.current.material.opacity = day;
      _c.set('#fff3d0').lerp(new THREE.Color('#ffd98a'), THREE.MathUtils.clamp((y - 480) / 60, 0, 1));
      sun.current.material.color.copy(_c);
    }
    if (earth.current) {
      // la Terre apparaît quand on quitte l'atmosphère
      earthMat.opacity = THREE.MathUtils.clamp((y - 400) / 40, 0, 1);
      earth.current.rotation.y = t * 0.01;
    }
    if (aurora.current) {
      // aurores boréales au-dessus de la glace
      auroraMat.opacity = THREE.MathUtils.clamp((y - 150) / 30, 0, 0.7) * THREE.MathUtils.clamp((280 - y) / 30, 0, 1);
      aurora.current.children.forEach((m, i) => {
        m.position.y = 330 + Math.sin(t * 0.3 + i * 2) * 15;
        m.rotation.y = i * 1.2 + Math.sin(t * 0.1 + i) * 0.2;
      });
    }
    // battement d'ailes
    birds.current.forEach((b, i) => {
      if (!b) return;
      const a = t * 0.22 + i * 1.3;
      const r = 60 + i * 14;
      b.position.set(Math.cos(a) * r, 118 + Math.sin(t * 0.5 + i) * 6 + i * 5, Math.sin(a) * r);
      b.rotation.y = -a - Math.PI / 2;
      const flap = Math.sin(t * 7 + i * 2) * 0.7;
      if (b.children[0]) b.children[0].rotation.z = flap;
      if (b.children[1]) b.children[1].rotation.z = -flap;
    });
  });

  return (
    <group>
      <mesh ref={dome} material={domeMat} frustumCulled={false} renderOrder={-100}>
        <sphereGeometry args={[820, 24, 16]} />
      </mesh>
      <points ref={stars} geometry={starGeo} material={starMat} frustumCulled={false} />
      <points geometry={cloudGeo} material={cloudMat} frustumCulled={false} />
      <points geometry={seaGeo} material={seaMat} frustumCulled={false} />

      {/* lune — visible depuis la fenêtre de la chambre */}
      <mesh ref={moon} position={[-180, 90, -420]}>
        <sphereGeometry args={[26, 20, 16]} />
        <meshBasicMaterial color="#f4ecd8" transparent opacity={1} fog={false} />
      </mesh>
      {/* soleil — apparaît à l'aube, dore le paradis */}
      <mesh ref={sun} position={[300, 560, 240]}>
        <sphereGeometry args={[34, 20, 16]} />
        <meshBasicMaterial color="#fff3d0" transparent opacity={0} fog={false} />
      </mesh>

      {/* la Terre, visible depuis l'espace */}
      <mesh ref={earth} position={[380, 300, 460]} material={earthMat}>
        <sphereGeometry args={[130, 32, 24]} />
      </mesh>

      {/* aurores boréales au-dessus du chapitre de glace */}
      <group ref={aurora}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-200 + i * 200, 320, -420 - i * 60]} material={auroraMat}>
            <planeGeometry args={[420, 130]} />
          </mesh>
        ))}
      </group>

      {/* ville lointaine */}
      <instancedMesh
        ref={(el) => {
          if (el && cityRef.current !== el) {
            cityRef.current = el;
            cityMatrices.forEach((m, i) => el.setMatrixAt(i, m));
            el.instanceMatrix.needsUpdate = true;
          }
        }}
        args={[undefined, undefined, cityCount]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={cityMat} attach="material" />
      </instancedMesh>

      {/* montagnes */}
      {mountains.map((m, k) => (
        <mesh key={k} position={m.pos} material={mountainMat}>
          <coneGeometry args={[m.w, m.h, 7]} />
        </mesh>
      ))}

      {/* oiseaux */}
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} ref={(el) => (birds.current[i] = el)}>
          <mesh position={[-0.6, 0, 0]} material={birdMat}>
            <planeGeometry args={[1.2, 0.35]} />
          </mesh>
          <mesh position={[0.6, 0, 0]} material={birdMat}>
            <planeGeometry args={[1.2, 0.35]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
