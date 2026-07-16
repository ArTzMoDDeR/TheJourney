import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { runtime } from '../../store/runtime';

// LE VOYAGEUR — vrai modèle 3D riggé (Synty), animé os par os par procédure
// (aucune animation fournie dans le glTF). On capture la pose de repos de
// chaque os puis on applique un offset chaque frame : course, saut, chute,
// échelle, hissée, idle — avec vraie flexion des coudes et genoux.

const CHAR_URL = '/models/character/Superhero_Male_FullBody.gltf';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

function damp(cur, target, lambda, dt) {
  return THREE.MathUtils.damp(cur, target, lambda, dt);
}

export function Character() {
  const { scene } = useGLTF(CHAR_URL);
  const root = useRef();

  // clone (plusieurs instances possibles) + ombres + collecte des os
  const { model, bones, offsetY, scale } = useMemo(() => {
    const m = scene.clone(true);
    const bones = {};
    m.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
      }
      if (o.isBone) bones[o.name] = o;
    });
    // mise à l'échelle : ~1.85 u de haut, pieds au bas de la capsule (-0.95)
    const box = new THREE.Box3().setFromObject(m);
    const h = box.max.y - box.min.y || 1.8;
    const scale = 1.85 / h;
    const offsetY = -0.95 - box.min.y * scale;
    // mémorise la pose de repos
    Object.values(bones).forEach((b) => {
      b.userData.rest = b.quaternion.clone();
    });
    return { model: m, bones, offsetY, scale };
  }, [scene]);

  // état d'animation persistant
  const a = useRef({ runPh: 0, climbPh: 0, pose: {} }).current;

  // applique un offset euler (rad) sur la pose de repos d'un os, amorti
  const flex = (name, x, y, z, dt, lambda = 13) => {
    const b = bones[name];
    if (!b) return;
    const p = a.pose[name] || (a.pose[name] = { x: 0, y: 0, z: 0 });
    p.x = damp(p.x, x, lambda, dt);
    p.y = damp(p.y, y, lambda, dt);
    p.z = damp(p.z, z, lambda, dt);
    _e.set(p.x, p.y, p.z);
    _q.setFromEuler(_e);
    b.quaternion.copy(b.userData.rest).multiply(_q);
  };

  useEffect(() => {
    useGLTF.preload(CHAR_URL);
  }, []);

  useFrame((_, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 1 / 30) * runtime.timeScale;
    const time = runtime.simTime;

    g.rotation.y = runtime.faceYaw;

    const mode = runtime.mode;
    const grounded = runtime.grounded;
    const speed = runtime.speed;
    const vy = runtime.playerVel.y;

    a.runPh += dt * (5 + speed * 1.15);
    a.climbPh += dt * (Math.abs(runtime.climbDir) * 6 + (mode === 'ladder' ? 2 : 0));

    // cibles par membre (offsets en radians, dans le repère local de l'os)
    let thigh = 0, calf = 0, thighAlt = 0, calfAlt = 0;
    let arm = 0, fore = 0, armAlt = 0, foreAlt = 0;
    let spine = 0, headY = 0, armOut = 0;

    if (mode === 'ladder') {
      const c = Math.sin(a.climbPh);
      arm = 1.9; fore = -1.1; armAlt = 1.9; foreAlt = -1.1;
      armOut = 0.3;
      // membres opposés alternent
      thigh = -0.5 - c * 0.6; calf = 1.0 + c * 0.5;
      thighAlt = -0.5 + c * 0.6; calfAlt = 1.0 - c * 0.5;
      arm += c * 0.5; armAlt -= c * 0.5;
      spine = 0.12; headY = 0;
    } else if (mode === 'mantle') {
      arm = 2.2; fore = -1.3; armAlt = 2.2; foreAlt = -1.3;
      armOut = 0.35;
      thigh = -0.8; calf = 1.5; thighAlt = -0.2; calfAlt = 0.8;
      spine = 0.4;
    } else if (!grounded) {
      if (vy > 1.5) {
        // ascension : bras levés, jambes repliées
        arm = 1.4; fore = -0.5; armAlt = 1.4; foreAlt = -0.5; armOut = 0.25;
        thigh = -0.7; calf = 1.0; thighAlt = -0.3; calfAlt = 0.7;
        spine = 0.08;
      } else {
        // chute : membres écartés
        const fl = Math.sin(time * 6) * 0.15;
        arm = 2.2 + fl; armAlt = 2.2 - fl; armOut = 0.6;
        fore = -0.3; foreAlt = -0.3;
        thigh = 0.3 + fl; calf = 0.4; thighAlt = -0.25 - fl; calfAlt = 0.5;
        spine = -0.12;
      }
    } else if (speed > 0.7) {
      // course : cycle jambes/bras opposés + flexion genoux/coudes
      const amp = Math.min(1, speed / 8);
      const ph = a.runPh;
      const s = Math.sin(ph);
      thigh = s * 0.95 * amp;
      thighAlt = -s * 0.95 * amp;
      calf = Math.max(0.1, -Math.sin(ph - 0.6)) * 1.1 * amp;
      calfAlt = Math.max(0.1, Math.sin(ph - 0.6)) * 1.1 * amp;
      arm = -s * 0.7 * amp; armAlt = s * 0.7 * amp;
      fore = -0.5 - Math.max(0, s) * 0.4 * amp;
      foreAlt = -0.5 - Math.max(0, -s) * 0.4 * amp;
      spine = 0.14 * amp + (speed > 8 ? 0.08 : 0);
      armOut = 0.12;
    } else {
      // idle : respiration + léger regard
      const b = Math.sin(time * 1.7);
      spine = 0.02 + b * 0.015;
      arm = 0.05; armAlt = 0.05; armOut = 0.08;
      calf = 0.04; calfAlt = 0.04;
      headY = Math.sin(time * 0.4) * 0.2;
    }

    // application (les os gauche/droite alternent la phase)
    flex('thigh_l', thigh, 0, 0, dt);
    flex('thigh_r', thighAlt, 0, 0, dt);
    flex('calf_l', calf, 0, 0, dt);
    flex('calf_r', calfAlt, 0, 0, dt);
    flex('upperarm_l', arm, 0, -armOut, dt);
    flex('upperarm_r', armAlt, 0, armOut, dt);
    flex('lowerarm_l', fore, 0, 0, dt);
    flex('lowerarm_r', foreAlt, 0, 0, dt);
    flex('spine_02', spine * 0.6, 0, 0, dt);
    flex('spine_01', spine * 0.4, 0, 0, dt);
    flex('Head', 0, headY, 0, dt, 6);

    // squash & stretch global à l'atterrissage / au rebond
    let sy = 1;
    const eLand = time - runtime.landedAt;
    const eBounce = time - runtime.bouncedAt;
    if (eLand >= 0 && eLand < 0.26) sy = 1 - Math.sin((eLand / 0.26) * Math.PI) * 0.14;
    if (eBounce >= 0 && eBounce < 0.3) sy = 1 + Math.sin((eBounce / 0.3) * Math.PI) * 0.18;
    g.scale.set(scale * (2 - sy), scale * sy, scale * (2 - sy));
  }, -1);

  return (
    <group ref={root} position={[0, offsetY, 0]} scale={scale}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(CHAR_URL);
