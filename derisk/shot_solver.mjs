// Le solveur — l'étage du milieu de la grammaire de direction.
//
//   intention FR ──LLM──> ShotSpec ──CE FICHIER──> CameraState ──> prompt + control pass
//
// Le LLM ne sort JAMAIS de coordonnées : il sort du vocabulaire de cinéma
// (taille de plan, angle, focale, mouvement). La géométrie est résolue ici, de
// façon déterministe. C'est ce qui fait qu'un plan est reproductible au lieu
// d'être une loterie — et c'est ce qui garantit mécaniquement les 180°.
//
//   node shot_solver.mjs        → résout et vérifie une couverture de 4 plans

// ── vocabulaire ─────────────────────────────────────────────────────────────

// Une taille de plan, c'est une hauteur de cadre en mètres. Rien d'autre.
export const SHOT_SIZES = {
  ECU: 0.25,   // très gros plan — les yeux
  CU:  0.45,   // gros plan — tête et haut des épaules
  MCU: 0.70,   // plan poitrine
  MS:  1.05,   // plan moyen / taille
  MLS: 1.45,   // plan américain (mi-cuisses)
  FS:  1.95,   // plan pied — corps entier avec de l'air
  LS:  3.20,   // plan large
  ELS: 6.50,   // très grand ensemble
}

// Hauteur de caméra, en fraction de la hauteur des yeux du sujet.
export const ANGLES = { low: 0.52, eye: 1.0, high: 1.28, overhead: 2.4 }

// Azimut par défaut : l'angle entre l'axe de regard du sujet et la caméra.
// 0° = pile dans l'axe (impossible en champ-contrechamp), 90° = profil pur.
export const AZIMUTH = { ots: 22, single: 38, profile: 90, master: 90 }

const EYE_RATIO = 0.94          // hauteur des yeux ≈ 94 % de la taille
const SENSOR_H = 24             // full-frame, 24 mm de haut

// ── maths ───────────────────────────────────────────────────────────────────
const rad = d => d * Math.PI / 180
const deg = r => r * 180 / Math.PI
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
const len = a => Math.hypot(a[0], a[1], a[2])
const norm = a => (len(a) ? mul(a, 1 / len(a)) : [0, 0, 0])
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

// FOV vertical depuis une focale 35 mm équivalent
export const fovFromFocal = mm => 2 * deg(Math.atan(SENSOR_H / 2 / mm))

// La formule qui fait tout le travail.
//   hauteur de cadre = 2 · d · tan(vFOV/2)  et  tan(vFOV/2) = 12/f
//   ⟹ d = hauteur de cadre × f / 24
// Une taille de plan et une focale déterminent la distance. Pas de réglage à la main.
export const distanceFor = (frameHeight_m, focal_mm) => frameHeight_m * focal_mm / SENSOR_H

// ── le solveur ──────────────────────────────────────────────────────────────

/**
 * @param spec  {subject, shotSize, angle, lens_mm, framing?, move?, duration_s?}
 * @param scene {actors:{id:{pos:[x,y,z], height}}, line:[idA,idB], side:+1|-1}
 */
export function solveShot(spec, scene) {
  const { actors, line, side } = scene
  const [lineA, lineB] = line

  // L'axe horizontal de la ligne d'action, et sa normale du côté autorisé.
  const axis = norm([...sub(actors[lineB].pos, actors[lineA].pos)].map((v, i) => (i === 1 ? 0 : v)))
  const normal = mul([-axis[2], 0, axis[0]], side)   // rotation de 90° dans le plan sol

  const isMaster = Array.isArray(spec.subject)
  const framing = spec.framing ?? (isMaster ? 'master' : 'single')
  const azimuth = spec.azimuth_deg ?? AZIMUTH[framing]

  let target, focusHeight, eyeY

  if (isMaster) {
    // Un plan d'ensemble se cadre sur le groupe : on vise le milieu, et la
    // distance est contrainte par la LARGEUR à couvrir, pas par la hauteur.
    const [p, q] = spec.subject.map(id => actors[id].pos)
    const mid = mul(add(p, q), 0.5)
    eyeY = Math.max(...spec.subject.map(id => actors[id].height)) * EYE_RATIO
    target = [mid[0], eyeY * 0.78, mid[2]]
    focusHeight = SHOT_SIZES[spec.shotSize]
  } else {
    const a = actors[spec.subject]
    eyeY = a.height * EYE_RATIO
    focusHeight = SHOT_SIZES[spec.shotSize]
    // Sur un gros plan on vise les yeux ; plus le plan s'élargit, plus on
    // descend vers le centre du corps.
    const t = Math.min(1, focusHeight / SHOT_SIZES.FS)
    target = [a.pos[0], eyeY - t * (eyeY - a.height * 0.5), a.pos[2]]
  }

  let distance = distanceFor(focusHeight, spec.lens_mm)

  if (isMaster) {
    // Élargir si les deux acteurs ne tiennent pas dans le cadre (16:9).
    const [p, q] = spec.subject.map(id => actors[id].pos)
    const spread = len(sub(q, p))
    const frameWidth = focusHeight * 16 / 9
    if (spread > frameWidth * 0.72) distance *= (spread / (frameWidth * 0.72))
  }

  // Direction sujet → caméra : on part de l'axe de regard (vers l'autre acteur)
  // et on s'écarte de `azimuth` degrés, toujours du côté `normal`.
  const gaze = isMaster ? mul(normal, 1) : norm(sub(actors[spec.subject === lineA ? lineB : lineA].pos, actors[spec.subject].pos))
  const gazeFlat = norm([gaze[0], 0, gaze[2]])
  const az = rad(isMaster ? 0 : azimuth)
  const dir = norm(add(mul(gazeFlat, Math.cos(az)), mul(normal, Math.sin(az))))

  const camY = eyeY * (ANGLES[spec.angle] ?? 1)
  const flat = add(target, mul(dir, distance))
  const pos = [flat[0], camY, flat[2]]

  // ── mouvement ─────────────────────────────────────────────────────────────
  const move = spec.move ?? { type: 'static' }
  const AMOUNT = { slow: 0.55, medium: 1.1, fast: 2.0 }
  const k = AMOUNT[move.speed ?? 'slow'] * (move.amount ?? 1)
  let posEnd = pos, targetEnd = target

  switch (move.type) {
    case 'push':  posEnd = add(pos, mul(dir, -Math.min(k, distance * 0.45))); break
    case 'pull':  posEnd = add(pos, mul(dir, +k)); break
    case 'dolly': posEnd = add(pos, mul([-dir[2], 0, dir[0]], k)); break
    case 'crane': posEnd = [pos[0], pos[1] + k * 0.8, pos[2]]; break
    case 'orbit': {
      const a2 = az + rad(12 * k) * (isMaster ? 1 : 1)
      const d2 = norm(add(mul(gazeFlat, Math.cos(a2)), mul(normal, Math.sin(a2))))
      const f2 = add(target, mul(d2, distance))
      posEnd = [f2[0], camY, f2[2]]
      break
    }
  }

  return {
    focal_mm: spec.lens_mm,
    fov_deg: +fovFromFocal(spec.lens_mm).toFixed(2),
    distance_m: +distance.toFixed(2),
    shotSize: spec.shotSize,
    angle: spec.angle,
    move: move.type,
    start: { pos: pos.map(r2), target: target.map(r2) },
    end:   { pos: posEnd.map(r2), target: targetEnd.map(r2) },
    at(t) { return { pos: lerp(pos, posEnd, t), target: lerp(target, targetEnd, t) } },
  }
}

const r2 = v => +v.toFixed(2)

// ── l'invariant des 180° ────────────────────────────────────────────────────
// De quel côté de la ligne d'action se trouve cette caméra ? Toutes les caméras
// d'une même scène doivent renvoyer le même signe, sinon ça ne raccorde pas.
export function sideOfLine(camPos, scene) {
  const { actors, line } = scene
  const a = actors[line[0]].pos, b = actors[line[1]].pos
  const ab = [b[0] - a[0], b[2] - a[2]]
  const ac = [camPos[0] - a[0], camPos[2] - a[2]]
  return Math.sign(ab[0] * ac[1] - ab[1] * ac[0])
}

export function checkCoverage(shots, scene) {
  const sides = shots.map(s => sideOfLine(s.start.pos, scene))
  const crossed = shots.filter((_, i) => sides[i] !== 0 && sides[i] !== sides[0])
  return { ok: crossed.length === 0, sides, crossed: crossed.length }
}

// ── auto-test ───────────────────────────────────────────────────────────────
if (import.meta.filename === process.argv[1]) {
  const scene = {
    actors: {
      A: { pos: [-1.05, 0, 0.48], height: 1.78 },
      B: { pos: [1.05, 0, -0.42], height: 1.64 },
    },
    line: ['A', 'B'],
    side: +1,
  }

  // Ce que le LLM produit à partir d'intentions en français.
  const COVERAGE = [
    ['« un master large, on voit les deux »',
      { subject: ['A', 'B'], shotSize: 'LS', angle: 'eye', lens_mm: 35, move: { type: 'push', speed: 'slow' } }],
    ['« serre sur le détective, plan poitrine »',
      { subject: 'A', shotSize: 'MCU', angle: 'eye', lens_mm: 85, move: { type: 'push', speed: 'slow' } }],
    ['« le contrechamp sur le suspect »',
      { subject: 'B', shotSize: 'MCU', angle: 'eye', lens_mm: 85, move: { type: 'push', speed: 'slow' } }],
    ['« gros plan, contre-plongée, il domine »',
      { subject: 'A', shotSize: 'CU', angle: 'low', lens_mm: 85, move: { type: 'static' } }],
  ]

  const solved = COVERAGE.map(([label, spec]) => {
    const s = solveShot(spec, scene)
    console.log(`\n${label}`)
    console.log(`  ${s.shotSize} ${s.focal_mm}mm ${s.angle} · ${s.move} · d=${s.distance_m}m · fov=${s.fov_deg}°`)
    console.log(`  cam ${JSON.stringify(s.start.pos)} → ${JSON.stringify(s.end.pos)}`)
    console.log(`  vise ${JSON.stringify(s.start.target)}`)
    return s
  })

  const check = checkCoverage(solved, scene)
  console.log(`\n─────────────────────────────────────────`)
  console.log(`180° : ${check.ok ? '✅ toutes les caméras du même côté' : `❌ ${check.crossed} caméra(s) franchissent la ligne`}`)
  console.log(`côtés: [${check.sides.join(', ')}]`)
}
