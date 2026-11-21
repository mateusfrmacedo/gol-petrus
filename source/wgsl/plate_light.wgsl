// Máscaras locais do Gol: recorte trapezoidal da moldura preta e facho sobre o asfalto.
// A aba acima da placa bloqueia a luz para cima; superfícies inferiores recebem o clarão.
fn plateLampMask(lp: vec3f, ln: vec3f) -> vec2f {
  if (lp.x >= -1.78 || lp.x <= -4.6 || lp.y >= 0.505 || abs(lp.z) > 1.6) { return vec2f(0.0, 0.0); }
  let width = 0.23 + 0.65 * clamp(0.485 - lp.y, 0.0, 0.24);
  let pocket = (1.0 - smoothstep(width - 0.025, width, abs(lp.z)))
    * smoothstep(0.20, 0.26, lp.y) * (1.0 - smoothstep(0.485, 0.505, lp.y))
    * smoothstep(-2.16, -2.05, lp.x) * (1.0 - smoothstep(-1.87, -1.78, lp.x))
    * smoothstep(0.25, 0.70, -ln.x) * (0.7 + 0.5 * clamp((0.485 - lp.y) / 0.24, 0.0, 1.0));
  let rear = -lp.x - 1.98;
  let spread = 0.28 + max(rear, 0.0) * 0.48;
  let pool = (1.0 - smoothstep(0.76, 1.0, abs(lp.z) / spread))
    * smoothstep(0.06, 0.28, rear) * (1.0 - smoothstep(1.35, 2.45, rear))
    * (1.0 - smoothstep(0.06, 0.16, lp.y)) * smoothstep(0.45, 0.9, ln.y)
    * smoothstep(0.28, 0.42, 0.505 - lp.y) / (1.0 + 0.55 * rear * rear);
  return vec2f(pocket, pool);
}
