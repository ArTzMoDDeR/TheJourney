// Formatage du chrono : m:ss.cc
export function formatTime(t) {
  if (t == null) return '--:--.--';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const c = Math.floor((t % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
