export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);
export const angleTo = (ax: number, ay: number, bx: number, by: number) => Math.atan2(by - ay, bx - ax);
export const angleDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
/** Frame-rate independent smoothing factor. */
export const damp = (rate: number, dtSec: number) => 1 - Math.exp(-rate * dtSec);

/** Distance from point to a ray segment starting at (ox,oy) with angle a and length len. */
export function pointToRay(px: number, py: number, ox: number, oy: number, a: number, len: number) {
  const dx = Math.cos(a), dy = Math.sin(a);
  const t = clamp((px - ox) * dx + (py - oy) * dy, 0, len);
  return Math.hypot(px - (ox + dx * t), py - (oy + dy * t));
}
