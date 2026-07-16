import * as THREE from 'three';

// Textures 100 % procédurales (canvas 2D → CanvasTexture).
// Aucun asset à télécharger : bois, papier d'écolier, briques, tissu,
// métal brossé, tranches de livres, post-its, horloges, dessins d'enfant…
// Tout est généré une fois au chargement et partagé.

function make(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// petit générateur déterministe local
function rngOf(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- BOIS
export function woodTexture(base = '#8a5a35', dark = '#6b421f', seed = 1) {
  return make(256, 256, (ctx, w, h) => {
    const r = rngOf(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // veines
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      const y0 = r() * h;
      ctx.moveTo(0, y0);
      for (let x = 0; x <= w; x += 16) {
        ctx.lineTo(x, y0 + Math.sin(x * 0.05 + i) * 3 + (r() - 0.5) * 4);
      }
      ctx.stroke();
    }
    // planches
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // nœuds
    for (let i = 0; i < 5; i++) {
      const x = r() * w;
      const y = r() * h;
      ctx.strokeStyle = 'rgba(40,20,5,0.35)';
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x, y, k * 3, k * 2, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
}

// ------------------------------------------------------- PAPIER D'ÉCOLIER
export function paperTexture() {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f7f4ea';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(90,140,200,0.55)';
    ctx.lineWidth = 1;
    for (let y = 16; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(220,90,90,0.6)';
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(28, h);
    ctx.stroke();
  });
}

export function graphPaperTexture() {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f2efe4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,150,190,0.4)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  });
}

// ---------------------------------------------------------------- BRIQUES
export function brickTexture(base = '#7a5a52', mortar = '#4e4340') {
  return make(256, 256, (ctx, w, h) => {
    const r = rngOf(7);
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, w, h);
    const bh = 32;
    const bw = 64;
    for (let row = 0; row < h / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < w / bw + 1; col++) {
        const shade = 0.85 + r() * 0.3;
        ctx.fillStyle = shadeColor(base, shade);
        ctx.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
  });
}

function shadeColor(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
  const g = Math.min(255, ((n >> 8) & 255) * f) | 0;
  const b = Math.min(255, (n & 255) * f) | 0;
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------- TISSU
export function fabricTexture(base = '#d9a7c7', line = '#b784a7') {
  return make(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = line;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    for (let i = -h; i < w; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

// -------------------------------------------------------------- PAPIER PEINT
export function wallpaperTexture() {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6a5566';
    ctx.fillRect(0, 0, w, h);
    // étoiles et lunes alternées, façon chambre d'enfant
    const drawStar = (x, y, s, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 ? s * 0.45 : s;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
    };
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 64 + (row % 2 ? 32 : 0) + 16;
        const y = row * 64 + 32;
        if ((row + col) % 2) drawStar(x, y, 9, 'rgba(255,220,150,0.35)');
        else {
          ctx.fillStyle = 'rgba(200,180,220,0.3)';
          ctx.beginPath();
          ctx.arc(x, y, 8, 0.6, Math.PI * 2 - 0.6);
          ctx.arc(x + 5, y, 6, Math.PI * 2 - 0.8, 0.8, true);
          ctx.fill();
        }
      }
    }
  }, { repeat: [4, 6] });
}

// ---------------------------------------------------------------- MÉTAL
export function metalTexture(base = '#5a7a6a', seed = 3) {
  return make(128, 128, (ctx, w, h) => {
    const r = rngOf(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${r() * 0.06})`;
      const y = r() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.1})`;
      const x = r() * w;
      const y = r() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8);
      ctx.stroke();
    }
  });
}

// --------------------------------------------------------------- MOQUETTE
export function carpetTexture() {
  return make(128, 128, (ctx, w, h) => {
    const r = rngOf(11);
    ctx.fillStyle = '#5e6167';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = `rgba(${140 + r() * 40},${145 + r() * 40},${150 + r() * 40},0.25)`;
      ctx.fillRect(r() * w, r() * h, 1.6, 1.6);
    }
  }, { repeat: [3, 3] });
}

// --------------------------------------------------- TRANCHES DE LIVRE
export function pagesTexture() {
  return make(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#efe6d0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,100,70,0.4)';
    for (let y = 0; y < h; y += 3) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

export function spineTexture(color, title) {
  return make(128, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = 'rgba(255,230,170,0.9)';
    ctx.strokeStyle = 'rgba(255,230,170,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 24, w - 20, h - 48);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 0, 0);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- POST-IT
export function postitTexture(text, color = '#ffe066') {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#333';
    ctx.font = 'italic 24px "Comic Sans MS", cursive, sans-serif';
    ctx.textAlign = 'center';
    const lines = text.split('\n');
    lines.forEach((l, i) => {
      ctx.fillText(l, w / 2, h / 2 - ((lines.length - 1) * 30) / 2 + i * 30, w - 30);
    });
  });
}

// ------------------------------------------------------------ CUBE-LETTRE
export function letterTexture(letter, bg, fg = '#f5edda') {
  return make(128, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = fg;
    ctx.font = 'bold 72px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, w / 2, h / 2 + 4);
  });
}

// ---------------------------------------------------------------- HORLOGE
// L'horloge de l'école est bloquée à 15 h 59 — une minute avant la sonnerie.
export function clockTexture(hours = 3, minutes = 59) {
  return make(256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = '#f2efe6';
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 8;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = i % 3 === 0 ? 6 : 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * 100, cy - Math.cos(a) * 100);
      ctx.lineTo(cx + Math.sin(a) * 112, cy - Math.cos(a) * 112);
      ctx.stroke();
    }
    const ma = (minutes / 60) * Math.PI * 2;
    const ha = ((hours + minutes / 60) / 12) * Math.PI * 2;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(ha) * 55, cy - Math.cos(ha) * 55);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(ma) * 90, cy - Math.cos(ma) * 90);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------------------------------------------------------------- ÉCRANS
export function screenTexture(kind = '404') {
  return make(256, 192, (ctx, w, h) => {
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, w, h);
    if (kind === '404') {
      ctx.fillStyle = '#7fd4ff';
      ctx.font = 'bold 54px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('404', w / 2, h / 2 - 8);
      ctx.font = '16px monospace';
      ctx.fillText('motivation not found', w / 2, h / 2 + 26);
    } else if (kind === 'sheet') {
      ctx.strokeStyle = 'rgba(127,212,255,0.5)';
      for (let y = 20; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.lineTo(w - 8, y);
        ctx.stroke();
      }
      for (let x = 8; x < w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, h - 12);
        ctx.stroke();
      }
      ctx.fillStyle = '#9fe8a8';
      ctx.font = '13px monospace';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.fillText(String(((r * 7 + c * 13) % 97) + 1), 16 + c * 48, 38 + r * 24);
        }
      }
    } else {
      // graphique qui monte… comme le joueur
      ctx.strokeStyle = '#9fe8a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, h - 16);
      let y = h - 16;
      for (let x = 12; x < w - 8; x += 18) {
        y -= Math.random() * 18 - 4;
        ctx.lineTo(x, Math.max(14, y));
      }
      ctx.stroke();
    }
  });
}

// ---------------------------------------------------------- CLAVIER
export function keyboardTexture() {
  return make(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2c2f34';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#484c54';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 12; c++) {
        ctx.fillRect(6 + c * 20.5, 8 + r * 28, 16, 22);
      }
    }
    // barre espace
    ctx.fillRect(70, 8 + 3 * 28, 110, 22);
  });
}

// -------------------------------------------------------- DESSINS D'ENFANT
// Cadres photo : les étapes d'une vie, dessinées au trait.
export function drawingTexture(kind) {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f7f2e2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath();
    if (kind === 'crib') {
      // berceau
      ctx.rect(58, 110, 140, 70);
      for (let x = 78; x <= 178; x += 25) {
        ctx.moveTo(x, 110);
        ctx.lineTo(x, 180);
      }
      ctx.moveTo(58, 195);
      ctx.lineTo(48, 215);
      ctx.moveTo(198, 195);
      ctx.lineTo(208, 215);
      ctx.moveTo(90, 90);
      ctx.arc(128, 90, 24, Math.PI, 0);
    } else if (kind === 'bike') {
      ctx.arc(78, 170, 38, 0, Math.PI * 2);
      ctx.moveTo(216, 170);
      ctx.arc(178, 170, 38, 0, Math.PI * 2);
      ctx.moveTo(78, 170);
      ctx.lineTo(120, 110);
      ctx.lineTo(178, 170);
      ctx.moveTo(120, 110);
      ctx.lineTo(148, 110);
      ctx.moveTo(100, 95);
      ctx.lineTo(135, 95);
    } else if (kind === 'gradcap') {
      ctx.moveTo(38, 120);
      ctx.lineTo(128, 80);
      ctx.lineTo(218, 120);
      ctx.lineTo(128, 160);
      ctx.closePath();
      ctx.moveTo(128, 160);
      ctx.lineTo(128, 190);
      ctx.moveTo(190, 133);
      ctx.lineTo(190, 185);
      ctx.arc(190, 192, 7, 0, Math.PI * 2);
    } else if (kind === 'heart') {
      ctx.moveTo(cx, cy + 45);
      ctx.bezierCurveTo(40, 130, 70, 55, cx, 105);
      ctx.bezierCurveTo(186, 55, 216, 130, cx, cy + 45);
    } else if (kind === 'house') {
      ctx.rect(70, 130, 116, 80);
      ctx.moveTo(56, 130);
      ctx.lineTo(128, 70);
      ctx.lineTo(200, 130);
      ctx.rect(112, 165, 32, 45);
      ctx.moveTo(150, 90);
      ctx.rect(150, 88, 18, 26);
    } else {
      // étoile filante
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 ? 18 : 40;
        ctx.lineTo(160 + Math.cos(a) * rad, 90 + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.moveTo(130, 120);
      ctx.lineTo(60, 190);
      ctx.moveTo(150, 135);
      ctx.lineTo(90, 200);
    }
    ctx.stroke();
    // soleil enfantin dans un coin
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(38, 38, 16, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.moveTo(38 + Math.cos(a) * 22, 38 + Math.sin(a) * 22);
      ctx.lineTo(38 + Math.cos(a) * 32, 38 + Math.sin(a) * 32);
    }
    ctx.stroke();
  });
}

// ---------------------------------------------------------------- ÉCORCE
export function barkTexture() {
  return make(128, 256, (ctx, w, h) => {
    const r = rngOf(41);
    ctx.fillStyle = '#5a4230';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 34; i++) {
      ctx.strokeStyle = `rgba(30,18,8,${0.25 + r() * 0.3})`;
      ctx.lineWidth = 2 + r() * 4;
      ctx.beginPath();
      let x = r() * w;
      ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 24) {
        x += (r() - 0.5) * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(140,110,70,${r() * 0.2})`;
      ctx.fillRect(r() * w, r() * h, 3 + r() * 8, 2 + r() * 3);
    }
  }, { repeat: [2, 3] });
}

// -------------------------------------------------------------- FEUILLAGE
export function leafTexture(base = '#3f7a35', dark = '#295223') {
  return make(128, 128, (ctx, w, h) => {
    const r = rngOf(43);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(${70 + r() * 60},${130 + r() * 60},${50 + r() * 40},0.55)`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 4 + r() * 8, 3 + r() * 5, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = base;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }, { repeat: [2, 2] });
}

// ------------------------------------------------------------------ HERBE
export function grassTexture() {
  return make(128, 128, (ctx, w, h) => {
    const r = rngOf(47);
    ctx.fillStyle = '#4a6a34';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      ctx.strokeStyle = `rgba(${60 + r() * 60},${110 + r() * 70},${40 + r() * 40},0.5)`;
      const x = r() * w;
      const y = r() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4);
      ctx.stroke();
    }
  }, { repeat: [10, 10] });
}

// ---------------------------------------------------------- PIERRE MOUSSUE
export function mossStoneTexture() {
  return make(128, 128, (ctx, w, h) => {
    const r = rngOf(53);
    ctx.fillStyle = '#7a7568';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(60,55,45,${r() * 0.3})`;
      ctx.fillRect(r() * w, r() * h, 8 + r() * 26, 4 + r() * 10);
    }
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(70,110,50,${0.2 + r() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 4 + r() * 12, 3 + r() * 7, r(), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40,38,32,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  });
}

// ------------------------------------------------------------------ GLACE
export function iceTexture() {
  return make(128, 128, (ctx, w, h) => {
    const r = rngOf(59);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#bfe2f2');
    g.addColorStop(1, '#8fc4e2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // fissures
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let x = r() * w;
      let y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (r() - 0.5) * 40;
        y += (r() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, { repeat: [2, 2] });
}

// ------------------------------------------------------------------ NEIGE
export function snowTexture() {
  return make(128, 128, (ctx, w, h) => {
    const r = rngOf(61);
    ctx.fillStyle = '#eef3f8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${200 + r() * 55},${210 + r() * 45},${230 + r() * 25},0.5)`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
  }, { repeat: [6, 6] });
}

// ---------------------------------------------------------------- LA TERRE
export function earthTexture() {
  return make(256, 128, (ctx, w, h) => {
    const r = rngOf(67);
    ctx.fillStyle = '#2a5a9a';
    ctx.fillRect(0, 0, w, h);
    // continents
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 3 ? '#4a7a44' : '#8a7a52';
      const cx = r() * w;
      const cy = r() * h;
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.ellipse(
          cx + (r() - 0.5) * 46,
          cy + (r() - 0.5) * 26,
          6 + r() * 18,
          4 + r() * 12,
          r() * Math.PI,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    // nuages
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 8 + r() * 18, 3 + r() * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // calottes
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(0, 0, w, 9);
    ctx.fillRect(0, h - 9, w, 9);
  });
}

// -------------------------------------------------------- TUNIQUE DU HÉROS
export function robeTexture() {
  return make(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8a2f2b';
    ctx.fillRect(0, 0, w, h);
    // tissage subtil
    const r = rngOf(71);
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = `rgba(${120 + r() * 40},${40 + r() * 20},${36 + r() * 16},0.25)`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
    // motifs dorés en losange (bande basse, façon Journey)
    ctx.strokeStyle = 'rgba(217,164,65,0.85)';
    ctx.lineWidth = 3;
    for (let x = 0; x < w + 32; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x - 16, h - 28);
      ctx.lineTo(x, h - 44);
      ctx.lineTo(x + 16, h - 28);
      ctx.lineTo(x, h - 12);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(217,164,65,0.9)';
    ctx.fillRect(0, h - 8, w, 8);
    ctx.fillRect(0, h - 52, w, 3);
  });
}

// ------------------------------------------------- IMMEUBLES LOINTAINS
export function windowsTexture(seed = 21) {
  return make(64, 128, (ctx, w, h) => {
    const r = rngOf(seed);
    ctx.fillStyle = '#232733';
    ctx.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 12) {
      for (let x = 6; x < w - 6; x += 10) {
        if (r() < 0.4) {
          ctx.fillStyle = r() < 0.8 ? 'rgba(255,214,140,0.9)' : 'rgba(180,220,255,0.85)';
          ctx.fillRect(x, y, 6, 8);
        }
      }
    }
  });
}

// ---------------------------------------------------------------- MARELLE
export function hopscotchTexture() {
  return make(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(245,240,220,0.9)';
    ctx.fillStyle = 'rgba(245,240,220,0.9)';
    ctx.lineWidth = 6;
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cell = (x, y, cw, ch, n) => {
      ctx.strokeRect(x, y, cw, ch);
      ctx.fillText(String(n), x + cw / 2, y + ch / 2);
    };
    let y = h - 90;
    cell(78, y, 100, 80, 1);
    y -= 84;
    cell(78, y, 100, 80, 2);
    y -= 84;
    cell(26, y, 100, 80, 3);
    cell(130, y, 100, 80, 4);
    y -= 84;
    cell(78, y, 100, 80, 5);
    y -= 84;
    cell(26, y, 100, 80, 6);
    cell(130, y, 100, 80, 7);
    // ciel
    ctx.beginPath();
    ctx.arc(128, 52, 46, 0, Math.PI, true);
    ctx.stroke();
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('CIEL', 128, 46);
  }, { srgb: true });
}

// ------------------------------------------------------------ SPRITES
export function cloudSprite() {
  return make(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
}

export function dotSprite() {
  return make(32, 32, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
}
