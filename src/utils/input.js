// Gestion clavier/souris centralisée.
// On utilise event.code (position PHYSIQUE des touches) : sur un clavier AZERTY
// les touches Z/Q/S/D correspondent aux codes KeyW/KeyA/KeyS/KeyD — le mapping
// ZQSD demandé fonctionne donc nativement, et reste jouable en WASD sur QWERTY.
export const input = {
  f: false, // Z — avancer
  b: false, // S — reculer
  l: false, // Q — gauche
  r: false, // D — droite
  sprint: false, // Shift
  jump: false, // Espace (maintenu)
  jumpPressed: false, // front montant, consommé par le contrôleur
  jumpReleased: false, // front descendant, consommé par le contrôleur
  slow: false, // clic droit (maintenu)
  mouseDX: 0,
  mouseDY: 0,
  mouseMovedAt: 0,
  anyMove: false, // un input de déplacement a eu lieu (démarrage du chrono)
};

let initialized = false;

export function initInput() {
  if (initialized) return;
  initialized = true;

  const setKey = (code, down) => {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        input.f = down;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.b = down;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.l = down;
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.r = down;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.sprint = down;
        break;
      case 'Space':
        if (down && !input.jump) input.jumpPressed = true;
        if (!down && input.jump) input.jumpReleased = true;
        input.jump = down;
        break;
      default:
        return;
    }
    if (down) input.anyMove = true;
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space') e.preventDefault();
    setKey(e.code, true);
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));

  window.addEventListener('mousedown', (e) => {
    if (e.button === 2) input.slow = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) input.slow = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
      input.mouseDX += e.movementX;
      input.mouseDY += e.movementY;
      input.mouseMovedAt = performance.now();
    }
  });

  // Évite les touches restées "enfoncées" quand la fenêtre perd le focus
  window.addEventListener('blur', () => {
    input.f = input.b = input.l = input.r = false;
    input.sprint = input.jump = input.slow = false;
  });
}

export function consumeMouse() {
  const dx = input.mouseDX;
  const dy = input.mouseDY;
  input.mouseDX = 0;
  input.mouseDY = 0;
  return [dx, dy];
}
