import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import { input } from '../../utils/input';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';
import { audio } from '../../audio/AudioSystem';
import { findLadder, findBouncer } from '../../level/ladders';
import {
  WALK_SPEED,
  SPRINT_SPEED,
  JUMP_VELOCITY,
  CLIMB_SPEED,
  SLOWMO_SCALE,
  SLOWMO_DRAIN,
  SLOWMO_REGEN,
  START_POS,
  LOW_GRAVITY_Y,
  biomeAt,
} from '../../constants';
import { PlayerModel } from './PlayerModel';

// CONTRÔLEUR DU VOYAGEUR
// - déplacement ZQSD relatif caméra, sprint, saut (coyote + buffer)
// - escalade UNIQUEMENT sur les échelles (registre géométrique, pas de grab mural)
// - rétablissement automatique en haut d'échelle
// - slow-motion (clic droit) par jauge
// - vent ascendant, trampolines (gérés par les objets), gravité réduite au paradis
// - respawn au checkpoint de chapitre en cas de chute dans le vide

const _pos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();

function dampAngle(a, b, lambda, dt) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
}

export function CharacterController() {
  const body = useRef(null);
  const { world, rapier } = useRapier();
  const resetToken = useGame((st) => st.resetToken);

  const s = useRef({
    mode: 'move', // move | ladder | mantle
    ladder: null,
    coyote: 0,
    jumpBuf: 0,
    ladderCooldown: 0, // délai avant ré-accroche après un saut d'échelle
    mantleT: 0,
    mantlePhase: 0, // 0 = montée, 1 = bascule vers l'avant
    mantleTargetY: 0, // altitude (centre capsule) à atteindre avant la bascule
    mantleDir: new THREE.Vector3(),
    faceYaw: Math.PI,
    stepAcc: 0,
    respawnT: -1,
    wasGrounded: true,
    prevVy: 0,
    landedOnce: false,
  }).current;

  const ray = useRef(null);
  if (!ray.current) ray.current = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  const FLAGS = rapier.QueryFilterFlags.EXCLUDE_SENSORS;

  const cast = (ox, oy, oz, dx, dy, dz, maxToi) => {
    const r = ray.current;
    r.origin.x = ox;
    r.origin.y = oy;
    r.origin.z = oz;
    r.dir.x = dx;
    r.dir.y = dy;
    r.dir.z = dz;
    return world.castRayAndGetNormal(r, maxToi, true, FLAGS, undefined, undefined, body.current);
  };

  const groundCast = (origin) => cast(origin.x, origin.y, origin.z, 0, -1, 0, 1.12);
  const toi = (hit) => (hit ? (hit.timeOfImpact ?? hit.toi) : Infinity);

  const teleport = (p) => {
    if (!body.current) return;
    body.current.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
    body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.current.setGravityScale(1, true);
    s.mode = 'move';
    s.ladder = null;
    s.respawnT = -1;
    runtime.mode = 'move';
  };

  useEffect(() => {
    runtime.playerBody = body.current;
  }, []);

  useEffect(() => {
    if (resetToken > 0) teleport(START_POS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  useFrame((_, rawDelta) => {
    if (!body.current) return;
    const game = useGame.getState();
    if (game.phase !== 'playing') {
      input.jumpPressed = false;
      input.jumpReleased = false;
      return;
    }

    const dt = Math.min(rawDelta, 1 / 30);

    // --- Slow motion ---
    const wantSlow = input.slow && runtime.slowmo > 0.02;
    runtime.targetTimeScale = wantSlow ? SLOWMO_SCALE : 1;
    runtime.timeScale += (runtime.targetTimeScale - runtime.timeScale) * Math.min(1, dt * 10);
    runtime.slowmoActive = wantSlow;
    audio.setSlow(wantSlow);
    if (wantSlow) runtime.slowmo = Math.max(0, runtime.slowmo - dt * SLOWMO_DRAIN);

    const sdt = dt * runtime.timeScale;

    // --- Chrono (temps réel, non clampé) ---
    if (!runtime.timerRunning && input.anyMove) runtime.timerRunning = true;
    if (runtime.timerRunning) runtime.timer += rawDelta;

    // --- État physique ---
    const t = body.current.translation();
    _pos.set(t.x, t.y, t.z);
    const lv = body.current.linvel();
    _vel.set(lv.x, lv.y, lv.z);

    // --- Respawn (chute dans le vide, sous le monde) ---
    const cp = game.checkpoint;
    if (s.respawnT < 0 && _pos.y < cp.killY) {
      s.respawnT = 0;
      runtime.fadeTarget = 1;
      audio.sfx('respawn');
    }
    if (s.respawnT >= 0) {
      s.respawnT += dt;
      if (s.respawnT > 0.45) {
        teleport(cp.pos);
        runtime.fadeTarget = 0;
      }
      input.jumpPressed = false;
      input.jumpReleased = false;
      return;
    }

    // --- Sol ---
    const groundHit = groundCast(_pos);
    const rawGrounded = !!groundHit && groundHit.normal.y > 0.45;
    const grounded = s.mode === 'move' && rawGrounded && _vel.y < 4;

    if (grounded && !s.wasGrounded && s.landedOnce) {
      runtime.landedAt = runtime.simTime;
      if (s.prevVy < -9) audio.sfx('land');
    }
    s.landedOnce = true;
    s.wasGrounded = grounded;
    s.prevVy = _vel.y;

    // --- Direction voulue (relative caméra) ---
    const yaw = runtime.camYaw;
    _fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const fAmt = (input.f ? 1 : 0) - (input.b ? 1 : 0);
    const rAmt = (input.r ? 1 : 0) - (input.l ? 1 : 0);
    _wish.copy(_fwd).multiplyScalar(fAmt).addScaledVector(_right, rAmt);
    if (_wish.lengthSq() > 1) _wish.normalize();

    // --- Fronts d'input ---
    const jumpPressed = input.jumpPressed;
    input.jumpPressed = false;
    input.jumpReleased = false;
    if (jumpPressed) s.jumpBuf = 0.12;
    else s.jumpBuf = Math.max(0, s.jumpBuf - sdt);
    s.ladderCooldown = Math.max(0, s.ladderCooldown - sdt);
    s.coyote = grounded ? 0.12 : Math.max(0, s.coyote - sdt);

    // ======================= MACHINE À ÉTATS =======================

    if (s.mode === 'ladder') {
      const l = s.ladder;
      const stillOn =
        l &&
        _pos.y > l.y0 - 0.5 &&
        _pos.y < l.y1 + 1.0 &&
        Math.abs(-(_pos.x - l.cx) * l.nz + (_pos.z - l.cz) * l.nx) < l.halfW + 0.5;

      if (jumpPressed) {
        // saut depuis l'échelle : vers l'arrière + direction voulue
        _vel.set(l.nx * 4.5, 8.5, l.nz * 4.5).addScaledVector(_wish, 3.5);
        body.current.setGravityScale(1, true);
        body.current.setLinvel(_vel, true);
        s.mode = 'move';
        s.ladder = null;
        s.ladderCooldown = 0.3;
        runtime.climbDir = 0;
        audio.sfx('walljump');
      } else if (!stillOn) {
        body.current.setGravityScale(1, true);
        s.mode = 'move';
        s.ladder = null;
        runtime.climbDir = 0;
      } else if (fAmt > 0 && _pos.y >= l.y1 - 0.25) {
        // sommet : rétablissement automatique par-dessus
        s.mode = 'mantle';
        s.mantleT = 0;
        s.mantlePhase = 0;
        s.mantleTargetY = l.y1 + 1.05;
        s.mantleDir.set(-l.nx, 0, -l.nz);
        s.ladder = null;
        runtime.climbDir = 0;
        audio.sfx('mantle');
      } else if (fAmt < 0 && (rawGrounded || _pos.y <= l.y0 + 0.15)) {
        // pied de l'échelle : on redescend au sol
        body.current.setGravityScale(1, true);
        s.mode = 'move';
        s.ladder = null;
        runtime.climbDir = 0;
      } else {
        // grimpe : Z monte, S descend, Q/D petit pas latéral
        const front = (_pos.x - l.cx) * l.nx + (_pos.z - l.cz) * l.nz;
        const lat = -(_pos.x - l.cx) * l.nz + (_pos.z - l.cz) * l.nx;
        const latVel = Math.abs(lat + rAmt) < l.halfW ? rAmt * 1.6 : 0;
        _vel.set(
          -l.nz * latVel + l.nx * (0.45 - front) * 8,
          fAmt * CLIMB_SPEED,
          l.nx * latVel + l.nz * (0.45 - front) * 8
        );
        body.current.setGravityScale(0, true);
        body.current.setLinvel(_vel, true);
        s.faceYaw = dampAngle(s.faceYaw, Math.atan2(-l.nx, -l.nz), 16, sdt);
        runtime.climbDir = fAmt;
        runtime.slowmo = Math.min(1, runtime.slowmo + dt * SLOWMO_REGEN * (wantSlow ? 0 : 1));
        if (fAmt !== 0) {
          s.stepAcc += CLIMB_SPEED * sdt;
          if (s.stepAcc > 1.3) {
            s.stepAcc = 0;
            audio.sfx('step');
          }
        }
      }
    } else if (s.mode === 'mantle') {
      s.mantleT += sdt;
      body.current.setGravityScale(0, true);
      if (s.mantlePhase === 0) {
        // montée verticale jusqu'à dépasser le rebord
        body.current.setLinvel({ x: 0, y: 7, z: 0 }, true);
        if (_pos.y >= s.mantleTargetY || s.mantleT > 0.7) {
          s.mantlePhase = 1;
          s.mantleT = 0;
        }
      } else if (s.mantleT < 0.24) {
        // bascule par-dessus le rebord
        body.current.setLinvel(
          { x: s.mantleDir.x * 3.8, y: 1.6, z: s.mantleDir.z * 3.8 },
          true
        );
      } else {
        body.current.setGravityScale(1, true);
        s.mode = 'move';
      }
    } else {
      // ---- MOVE ----
      // Accroche d'échelle : on pousse vers l'échelle (ou espace en l'air devant elle)
      if (s.ladderCooldown <= 0) {
        const l = findLadder(_pos.x, _pos.y, _pos.z);
        if (l) {
          const towards = _wish.x * -l.nx + _wish.z * -l.nz; // input vers l'échelle
          const wantsClimb = towards > 0.35 || (!grounded && input.jump);
          // au sol : seulement si on monte (fAmt vers l'échelle) ; en l'air : plus permissif
          if (wantsClimb && (!grounded || towards > 0.35)) {
            s.mode = 'ladder';
            s.ladder = l;
            body.current.setGravityScale(0, true);
            body.current.setLinvel({ x: 0, y: Math.max(0, _vel.y * 0.2), z: 0 }, true);
            audio.sfx('grab');
          }
        }
      }

      // Accroche de rebord : espace maintenu en l'air près du bord d'un bloc
      // → le personnage attrape le rebord et se hisse dessus (mantle).
      if (s.mode === 'move' && input.jump && !grounded && _vel.y < 6 && s.ladderCooldown <= 0) {
        const bases = [];
        if (_wish.lengthSq() > 0.04) bases.push(Math.atan2(_wish.x, _wish.z));
        bases.push(s.faceYaw);
        outer: for (const base of bases) {
          for (const a of [0, -0.35, 0.35]) {
            const dx = Math.sin(base + a);
            const dz = Math.cos(base + a);
            // 1. un mur devant le buste ?
            const wall = cast(_pos.x, _pos.y + 0.3, _pos.z, dx, 0, dz, 1.05);
            const wallToi = toi(wall);
            if (!wall || Math.abs(wall.normal.y) > 0.4) continue;
            // la face doit être tournée vers nous
            if (wall.normal.x * dx + wall.normal.z * dz > -0.2) continue;
            // 2. de l'air au-dessus du rebord ?
            const clear = cast(_pos.x, _pos.y + 1.9, _pos.z, dx, 0, dz, wallToi + 0.7);
            if (clear) continue;
            // 3. un dessus praticable, à portée de main ?
            const overX = _pos.x + dx * (wallToi + 0.45);
            const overZ = _pos.z + dz * (wallToi + 0.45);
            const top = cast(overX, _pos.y + 1.9, overZ, 0, -1, 0, 2.2);
            if (!top || top.normal.y < 0.6) continue;
            const topY = _pos.y + 1.9 - toi(top);
            const rise = topY - (_pos.y - 0.95); // hauteur du rebord vs pieds
            if (rise < 0.3 || rise > 2.6) continue;
            // c'est un rebord : on s'y hisse
            s.mode = 'mantle';
            s.mantleT = 0;
            s.mantlePhase = 0;
            s.mantleTargetY = topY + 1.05;
            s.mantleDir.set(dx, 0, dz);
            s.ladderCooldown = 0.3;
            body.current.setGravityScale(0, true);
            body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            audio.sfx('grab');
            break outer;
          }
        }
      }

      if (s.mode === 'move') {
        const targetSpeed = input.sprint && grounded ? SPRINT_SPEED : WALK_SPEED;
        const accel = grounded ? 11 : 3.5;
        _wish.multiplyScalar(targetSpeed);
        _vel.x = THREE.MathUtils.damp(_vel.x, _wish.x, accel, sdt);
        _vel.z = THREE.MathUtils.damp(_vel.z, _wish.z, accel, sdt);

        // Trampolines : détectés par le rayon de sol, rebond garanti
        const groundToi = groundHit ? (groundHit.timeOfImpact ?? groundHit.toi) : Infinity;
        if (groundToi < 1.1 && _vel.y < 1) {
          const feetY = _pos.y - groundToi;
          const b = findBouncer(_pos.x, _pos.z, feetY);
          if (b) {
            _vel.y = b.power;
            _vel.x *= 0.85;
            _vel.z *= 0.85;
            runtime.bouncedAt = runtime.simTime;
            audio.sfx('bounce');
          }
        }

        if (s.jumpBuf > 0 && (grounded || s.coyote > 0) && _vel.y < JUMP_VELOCITY) {
          _vel.y = JUMP_VELOCITY;
          s.jumpBuf = 0;
          s.coyote = 0;
          audio.sfx('jump');
        }

        if (runtime.inWind > 0) {
          _vel.y = Math.min(_vel.y + 55 * sdt, 14);
        }

        if (_vel.y < -34) _vel.y = -34;

        body.current.setLinvel(_vel, true);
        body.current.setGravityScale(_pos.y > LOW_GRAVITY_Y ? 0.55 : 1, true);

        const hSpeed = Math.hypot(_vel.x, _vel.z);
        if (hSpeed > 0.8 && _wish.lengthSq() > 0.01) {
          s.faceYaw = dampAngle(s.faceYaw, Math.atan2(_wish.x, _wish.z), 12, sdt);
        }

        if (grounded && hSpeed > 1) {
          s.stepAcc += hSpeed * sdt;
          if (s.stepAcc > 2.6) {
            s.stepAcc = 0;
            audio.sfx('step');
          }
        }

        if (grounded && !wantSlow) {
          runtime.slowmo = Math.min(1, runtime.slowmo + dt * SLOWMO_REGEN);
        }
      }
    }

    // ======================= SORTIES GLOBALES =======================

    runtime.playerPos.copy(_pos);
    runtime.playerVel.copy(_vel);
    runtime.grounded = grounded;
    runtime.mode = s.mode;
    runtime.speed = Math.hypot(_vel.x, _vel.z);
    runtime.faceYaw = s.faceYaw;

    const airSpeed = _vel.length();
    audio.setWind(grounded ? 0 : Math.max(0, (airSpeed - 8) / 20));

    const biome = biomeAt(_pos.y);
    if (biome.name !== runtime.biome) {
      const order = ['bedroom', 'school', 'office', 'paradise'];
      const labels = {
        bedroom: 'La Chambre',
        school: "L'École",
        office: 'Le Bureau',
        paradise: 'Le Paradis',
      };
      const leaving = runtime.biome;
      if (order.indexOf(biome.name) > order.indexOf(leaving) && runtime.timerRunning) {
        game.addSplit(leaving, labels[leaving], runtime.timer);
      }
      runtime.biome = biome.name;
      runtime.biomeLabel = biome.label;
      runtime.biomeChangedAt = performance.now();
      audio.setBiome(biome.name);
    }
  }, -3);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={START_POS}
      enabledRotations={[false, false, false]}
      ccd
      linearDamping={0.03}
      userData={{ player: true }}
      name="player"
    >
      <CapsuleCollider args={[0.6, 0.35]} friction={0} restitution={0} />
      <PlayerModel />
    </RigidBody>
  );
}
