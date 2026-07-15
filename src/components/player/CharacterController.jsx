import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import { input } from '../../utils/input';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';
import { audio } from '../../audio/AudioSystem';
import {
  WALK_SPEED,
  SPRINT_SPEED,
  JUMP_VELOCITY,
  CLIMB_SPEED,
  SLOWMO_SCALE,
  SLOWMO_DRAIN,
  SLOWMO_REGEN,
  STAMINA_DRAIN_HANG,
  STAMINA_DRAIN_CLIMB,
  STAMINA_REGEN,
  START_POS,
  LOW_GRAVITY_Y,
  biomeAt,
} from '../../constants';
import { PlayerModel } from './PlayerModel';

// Vecteurs temporaires réutilisés (zéro allocation par frame)
const _pos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _n = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _upT = new THREE.Vector3();
const _rightT = new THREE.Vector3();
const _climbV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

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

  // État interne du contrôleur (hors React)
  const s = useRef({
    mode: 'move', // move | hang | mantle
    coyote: 0,
    jumpBuf: 0,
    grabDelay: 0, // délai avant de pouvoir (re)grimper après un saut
    hangN: new THREE.Vector3(0, 0, 1),
    mantleT: 0,
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

  // Lance un rayon (en excluant les sensors et le corps du joueur).
  // Retourne { toi, normal, grabbable } ou null.
  const cast = (origin, dir, maxToi) => {
    const r = ray.current;
    r.origin.x = origin.x;
    r.origin.y = origin.y;
    r.origin.z = origin.z;
    r.dir.x = dir.x;
    r.dir.y = dir.y;
    r.dir.z = dir.z;
    const hit = world.castRayAndGetNormal(r, maxToi, true, FLAGS, undefined, undefined, body.current);
    if (!hit) return null;
    const parent = hit.collider.parent();
    return {
      toi: hit.timeOfImpact ?? hit.toi,
      normal: hit.normal,
      grabbable: !!(parent && parent.userData && parent.userData.grabbable),
    };
  };

  // Téléportation au checkpoint / au départ
  const teleport = (p) => {
    if (!body.current) return;
    body.current.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
    body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.current.setGravityScale(1, true);
    s.mode = 'move';
    s.respawnT = -1;
    s.grabDelay = 0.2;
    runtime.stamina = 1;
    runtime.mode = 'move';
  };

  useEffect(() => {
    runtime.playerBody = body.current;
  }, []);

  // restart : retour au départ
  useEffect(() => {
    if (resetToken > 0) teleport(START_POS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  useFrame((_, rawDelta) => {
    if (!body.current) return;
    const game = useGame.getState();
    if (game.phase !== 'playing') {
      // consomme les fronts pour éviter un saut fantôme à la reprise
      input.jumpPressed = false;
      input.jumpReleased = false;
      return;
    }

    const dt = Math.min(rawDelta, 1 / 30);

    // --- Slow motion (clic droit) ---
    const wantSlow = input.slow && runtime.slowmo > 0.02;
    runtime.targetTimeScale = wantSlow ? SLOWMO_SCALE : 1;
    runtime.timeScale +=
      (runtime.targetTimeScale - runtime.timeScale) * Math.min(1, dt * 10);
    runtime.slowmoActive = wantSlow;
    audio.setSlow(wantSlow);
    if (wantSlow) runtime.slowmo = Math.max(0, runtime.slowmo - dt * SLOWMO_DRAIN);

    const sdt = dt * runtime.timeScale; // delta en temps simulé

    // --- Chrono speedrun : démarre au premier input, temps RÉEL non borné
    // (le delta physique est clampé, pas le chrono : il doit rester exact
    // même si le rendu ralentit) ---
    if (!runtime.timerRunning && input.anyMove) runtime.timerRunning = true;
    if (runtime.timerRunning) runtime.timer += rawDelta;

    // --- Lecture de l'état physique ---
    const t = body.current.translation();
    _pos.set(t.x, t.y, t.z);
    const lv = body.current.linvel();
    _vel.set(lv.x, lv.y, lv.z);

    // --- Respawn en cours ? ---
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
    _dir.set(0, -1, 0);
    const groundHit = cast(_pos, _dir, 1.12);
    const grounded =
      s.mode === 'move' && !!groundHit && groundHit.normal.y > 0.45 && _vel.y < 4;

    if (grounded && !s.wasGrounded && s.prevVy < -9 && s.landedOnce) {
      audio.sfx('land');
    }
    s.landedOnce = true;
    s.wasGrounded = grounded;
    s.prevVy = _vel.y;

    // --- Direction souhaitée (relative à la caméra) ---
    const yaw = runtime.camYaw;
    _fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const fAmt = (input.f ? 1 : 0) - (input.b ? 1 : 0);
    const rAmt = (input.r ? 1 : 0) - (input.l ? 1 : 0);
    _wish.copy(_fwd).multiplyScalar(fAmt).addScaledVector(_right, rAmt);
    if (_wish.lengthSq() > 1) _wish.normalize();

    // --- Fronts d'input ---
    const jumpPressed = input.jumpPressed;
    const jumpReleased = input.jumpReleased;
    input.jumpPressed = false;
    input.jumpReleased = false;
    if (jumpPressed) s.jumpBuf = 0.12;
    else s.jumpBuf = Math.max(0, s.jumpBuf - sdt);
    s.grabDelay = Math.max(0, s.grabDelay - sdt);
    s.coyote = grounded ? 0.12 : Math.max(0, s.coyote - sdt);

    // ======================= MACHINE À ÉTATS =======================

    if (s.mode === 'hang') {
      // ---- ACCROCHÉ / GRIMPE ----
      _n.copy(s.hangN);
      _origin.copy(_pos).add(UP.clone().multiplyScalar(0.35));
      _dir.copy(_n).negate();
      const chestHit = cast(_origin, _dir, 1.1);

      const upAmt = fAmt; // Z = monter, S = descendre
      const latAmt = rAmt; // Q/D = latéral le long du mur
      const climbing = Math.abs(upAmt) + Math.abs(latAmt) > 0;
      runtime.climbAmount = climbing ? 1 : 0;

      // Stamina : se vide accroché, plus vite immobile
      runtime.stamina = Math.max(
        0,
        runtime.stamina - sdt * (climbing ? STAMINA_DRAIN_CLIMB : STAMINA_DRAIN_HANG)
      );

      // Slow-mo se recharge accroché
      runtime.slowmo = Math.min(1, runtime.slowmo + dt * SLOWMO_REGEN * (wantSlow ? 0 : 1));

      let release = false;
      let wallJump = false;

      if (runtime.stamina <= 0) {
        release = true; // plus de force : lâche
        s.grabDelay = 0.6;
      } else if (jumpReleased || !input.jump) {
        // Relâcher espace : saute si une direction est tenue, sinon lâche
        if (_wish.lengthSq() > 0.1) wallJump = true;
        else release = true;
        s.grabDelay = 0.25;
      }

      if (wallJump) {
        _vel
          .copy(_n)
          .multiplyScalar(5.5)
          .addScaledVector(_wish, 4.5);
        _vel.y = 9.5;
        body.current.setGravityScale(1, true);
        body.current.setLinvel(_vel, true);
        s.mode = 'move';
        s.grabDelay = 0.18;
        audio.sfx('walljump');
      } else if (release) {
        body.current.setGravityScale(1, true);
        body.current.setLinvel({ x: 0, y: _vel.y, z: 0 }, true);
        s.mode = 'move';
      } else if (!chestHit || !chestHit.grabbable) {
        // Le mur a disparu devant le buste
        if (upAmt > 0) {
          // On grimpe vers le haut : y a-t-il un rebord ?
          _origin.copy(_pos).add(UP.clone().multiplyScalar(1.6)).addScaledVector(_n, -0.7);
          _dir.set(0, -1, 0);
          const ledge = cast(_origin, _dir, 2.0);
          if (ledge && ledge.normal.y > 0.55) {
            s.mode = 'mantle';
            s.mantleT = 0;
            s.mantleDir.copy(_n).negate().setY(0).normalize();
            audio.sfx('mantle');
          } else {
            body.current.setGravityScale(1, true);
            s.mode = 'move';
            s.grabDelay = 0.05; // ré-accroche immédiate si une surface adjacente existe
          }
        } else {
          body.current.setGravityScale(1, true);
          s.mode = 'move';
          s.grabDelay = 0.05;
        }
      } else {
        // Grimpe : déplacement le long de la surface
        _n.set(chestHit.normal.x, chestHit.normal.y, chestHit.normal.z).normalize();
        s.hangN.copy(_n);
        // base tangente au mur
        _upT.copy(UP).addScaledVector(_n, -UP.dot(_n)).normalize();
        _rightT.crossVectors(UP, _n).normalize();
        _climbV
          .copy(_upT)
          .multiplyScalar(upAmt * CLIMB_SPEED)
          .addScaledVector(_rightT, latAmt * CLIMB_SPEED);
        // plaquage doux contre le mur
        const dist = chestHit.toi;
        if (dist > 0.55) _climbV.addScaledVector(_n, -1.6);
        else if (dist < 0.4) _climbV.addScaledVector(_n, 0.8);
        body.current.setGravityScale(0, true);
        body.current.setLinvel(_climbV, true);
        s.faceYaw = dampAngle(s.faceYaw, Math.atan2(-_n.x, -_n.z), 14, sdt);
        // bruit de grimpe
        if (climbing) {
          s.stepAcc += CLIMB_SPEED * sdt;
          if (s.stepAcc > 1.6) {
            s.stepAcc = 0;
            audio.sfx('step');
          }
        }
      }
    } else if (s.mode === 'mantle') {
      // ---- RÉTABLISSEMENT SUR REBORD ----
      s.mantleT += sdt;
      body.current.setGravityScale(0, true);
      if (s.mantleT < 0.24) {
        body.current.setLinvel({ x: 0, y: 7, z: 0 }, true);
      } else if (s.mantleT < 0.46) {
        _climbV.copy(s.mantleDir).multiplyScalar(3.4);
        _climbV.y = 2.2;
        body.current.setLinvel(_climbV, true);
      } else {
        body.current.setGravityScale(1, true);
        s.mode = 'move';
        s.grabDelay = 0.15;
      }
    } else {
      // ---- DÉPLACEMENT AU SOL / EN L'AIR ----
      runtime.climbAmount = 0;

      // Tentative d'accroche : espace maintenu, en l'air, mur grimpable devant
      if (
        input.jump &&
        !grounded &&
        s.grabDelay <= 0 &&
        runtime.stamina > 0.05 &&
        _vel.y < 7
      ) {
        let best = null;
        _origin.copy(_pos).add(UP.clone().multiplyScalar(0.35));
        // éventail de rayons : d'abord autour de l'INTENTION du joueur
        // (direction d'input), puis autour de son regard
        const bases = [];
        if (_wish.lengthSq() > 0.04) bases.push(Math.atan2(_wish.x, _wish.z));
        bases.push(s.faceYaw);
        for (const base of bases) {
          for (const a of [-0.45, -0.22, 0, 0.22, 0.45]) {
            const fy = base + a;
            _dir.set(Math.sin(fy), 0, Math.cos(fy));
            const hit = cast(_origin, _dir, 1.1);
            if (!hit || !hit.grabbable) continue;
            const ny = hit.normal.y;
            // pente entre ~60° et ~105° : un mur, pas une rampe ni un plafond
            if (ny > 0.5 || ny < -0.25) continue;
            // la normale doit faire face au joueur
            if (hit.normal.x * _dir.x + hit.normal.z * _dir.z > -0.1) continue;
            if (!best || hit.toi < best.toi) best = hit;
          }
          if (best) break;
        }
        if (best) {
          s.mode = 'hang';
          s.hangN.set(best.normal.x, best.normal.y, best.normal.z).normalize();
          body.current.setGravityScale(0, true);
          body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          audio.sfx('grab');
        }
      }

      if (s.mode === 'move') {
        // Vitesse cible (sprint uniquement au sol, avec inertie douce)
        const targetSpeed = input.sprint && grounded ? SPRINT_SPEED : WALK_SPEED;
        const accel = grounded ? 11 : 3.5;
        _wish.multiplyScalar(targetSpeed);
        _vel.x = THREE.MathUtils.damp(_vel.x, _wish.x, accel, sdt);
        _vel.z = THREE.MathUtils.damp(_vel.z, _wish.z, accel, sdt);

        // Saut (avec buffer + coyote time)
        if (s.jumpBuf > 0 && (grounded || s.coyote > 0)) {
          _vel.y = JUMP_VELOCITY;
          s.jumpBuf = 0;
          s.coyote = 0;
          s.grabDelay = 0.18;
          audio.sfx('jump');
        }

        // Colonnes de vent ascendant (paradis)
        if (runtime.inWind > 0) {
          _vel.y = Math.min(_vel.y + 55 * sdt, 14);
        }

        // Limite de chute
        if (_vel.y < -32) _vel.y = -32;

        body.current.setLinvel(_vel, true);

        // Gravité réduite dans les derniers mètres (lâcher-prise)
        body.current.setGravityScale(_pos.y > LOW_GRAVITY_Y ? 0.5 : 1, true);

        // Orientation du personnage vers le déplacement
        const hSpeed = Math.hypot(_vel.x, _vel.z);
        if (hSpeed > 0.8 && _wish.lengthSq() > 0.01) {
          s.faceYaw = dampAngle(s.faceYaw, Math.atan2(_wish.x, _wish.z), 12, sdt);
        }

        // Pas
        if (grounded && hSpeed > 1) {
          s.stepAcc += hSpeed * sdt;
          if (s.stepAcc > 2.6) {
            s.stepAcc = 0;
            audio.sfx('step');
          }
        }

        // Recharges au sol
        if (grounded) {
          runtime.stamina = Math.min(1, runtime.stamina + sdt * STAMINA_REGEN);
          if (!wantSlow) runtime.slowmo = Math.min(1, runtime.slowmo + dt * SLOWMO_REGEN);
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
    runtime.hangNormal.copy(s.hangN);

    // Vent audio selon la vitesse verticale/horizontale
    const airSpeed = _vel.length();
    audio.setWind(grounded ? 0 : Math.max(0, (airSpeed - 8) / 20));

    // Biome courant + splits
    const biome = biomeAt(_pos.y);
    if (biome.name !== runtime.biome) {
      const order = ['bedroom', 'school', 'office', 'paradise'];
      const labels = {
        bedroom: 'La Chambre',
        school: "L'École",
        office: 'Le Bureau',
        paradise: 'Le Paradis',
      };
      // split enregistré quand on quitte un biome vers le haut
      const leaving = runtime.biome;
      if (order.indexOf(biome.name) > order.indexOf(leaving) && runtime.timerRunning) {
        game.addSplit(leaving, labels[leaving], runtime.timer);
      }
      runtime.biome = biome.name;
      runtime.biomeLabel = biome.label;
      runtime.biomeChangedAt = performance.now();
      audio.setBiome(biome.name);
    }
  }, -3); // priorité -3 : tourne AVANT le step physique (-2)

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
