// Smoke test: does a *synthetic* WebGL depth pass actually drive a video model,
// and do three cameras on the same beat come back matching?
//
//   FAL_KEY=xxx node fal_smoke.mjs probe            # dump the endpoint's input schema
//   FAL_KEY=xxx node fal_smoke.mjs run              # 3 cameras through Wan VACE depth
//   FAL_KEY=xxx node fal_smoke.mjs run wide         # just one
//   FAL_KEY=xxx node fal_smoke.mjs run --seedance   # Seedance 2.0, greybox as @Video1
//
// Run `node render.mjs` first — this consumes derisk/out/*.mp4.
import { fal } from '@fal-ai/client'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const HERE = import.meta.dirname
const OUT = join(HERE, 'out')

if (!process.env.FAL_KEY) {
  console.error('set FAL_KEY (https://fal.ai/dashboard/keys)')
  process.exit(1)
}
fal.config({ credentials: process.env.FAL_KEY })

// ── the scene, described once and reused for every camera ───────────────────
// This is the whole point: identical prompt + identical seed + identical beat,
// only the camera changes. That is what makes the three angles cut together.
const LOOK = 'Harsh overhead tungsten light, deep shadows, faint smoke haze in the air, '
  + '1970s film stock, visible grain, muted teal and amber palette, anamorphic, shallow depth of field'
const SCENE = 'A tense late-night interrogation in a bare concrete room. A weathered detective in a '
  + 'rumpled grey coat leans across a steel table toward a young suspect in a dark jacket.'
const SEED = 424242

const SHOTS = {
  wide:    'Wide master shot, 35mm lens, slow dolly in. Both men in frame across the table.',
  close:   'Medium close-up on the detective, 85mm lens, slow push in. He leans forward into the light.',
  reverse: 'Reverse medium close-up on the suspect, 85mm lens, slow push in. He shrinks back from the table.',
}
const prompt = (shot) => `${SCENE} ${SHOTS[shot]} ${LOOK}`

const NEGATIVE = 'cartoon, 3d render, cgi, video game, plastic, mannequin, dummy, doll, '
  + 'blurry, low quality, watermark, text, distorted faces, extra limbs'

// ── endpoints ───────────────────────────────────────────────────────────────
const useSeedance = process.argv.includes('--seedance')
const MODEL = useSeedance ? 'fal-ai/bytedance/seedance/v2/reference-to-video'
                          : 'fal-ai/wan-vace-14b/depth'

// The greybox beauty pass is the better motion reference for Seedance (it has
// shading and silhouettes); the depth pass is what VACE's depth branch wants.
const passFor = (shot) => join(OUT, `${shot}_${useSeedance ? 'beauty' : 'depth'}.mp4`)

const payload = (shot, videoUrl) => useSeedance
  ? {
      // Seedance references assets positionally in the prompt text.
      prompt: `${prompt(shot)} Follow the exact camera movement and staging of @Video1.`,
      reference_video_urls: [videoUrl],
      resolution: '720p',
      seed: SEED,
    }
  : {
      prompt: prompt(shot),
      negative_prompt: NEGATIVE,
      video_url: videoUrl,
      resolution: '480p',
      match_input_num_frames: true,
      seed: SEED,
    }

// ── probe: ask fal what this endpoint actually accepts ──────────────────────
// Field names below are a best guess from the docs; run this once and fix them
// against the real schema before burning credits.
if (process.argv[2] === 'probe') {
  const url = `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${MODEL}`
  const r = await fetch(url)
  if (!r.ok) { console.error(`schema fetch failed: http ${r.status}`); process.exit(1) }
  const spec = await r.json()
  const input = Object.entries(spec.components?.schemas ?? {}).find(([k]) => /Input$/.test(k))?.[1]
  console.log(`\n${MODEL} — input fields:\n`)
  for (const [k, v] of Object.entries(input?.properties ?? {})) {
    const req = input.required?.includes(k) ? ' (required)' : ''
    console.log(`  ${k}: ${v.type ?? v.anyOf?.map(a => a.type).join('|')}${req}`)
    if (v.description) console.log(`      ${v.description.split('\n')[0]}`)
  }
  process.exit(0)
}

// ── run ─────────────────────────────────────────────────────────────────────
const only = process.argv.slice(3).find(a => !a.startsWith('--'))
const have = (await readdir(OUT).catch(() => [])).filter(f => f.endsWith('.mp4'))
if (!have.length) { console.error('no clips in derisk/out — run `node render.mjs` first'); process.exit(1) }

const shots = (only ? [only] : Object.keys(SHOTS))
  .filter(s => have.includes(`${s}_${useSeedance ? 'beauty' : 'depth'}.mp4`))

console.log(`model:  ${MODEL}`)
console.log(`shots:  ${shots.join(', ')}`)
console.log(`seed:   ${SEED}  (locked across all cameras — this is the coverage test)\n`)

const results = await Promise.all(shots.map(async (shot) => {
  const tag = shot.padEnd(8)
  try {
    const file = passFor(shot)
    const videoUrl = await fal.storage.upload(new Blob([await readFile(file)], { type: 'video/mp4' }))
    console.log(`${tag} uploaded control pass`)

    const res = await fal.subscribe(MODEL, {
      input: payload(shot, videoUrl),
      logs: false,
      onQueueUpdate: (u) => u.status === 'IN_PROGRESS' && process.stdout.write(`${tag} generating…\n`),
    })

    const out = res.data?.video?.url ?? res.data?.videos?.[0]?.url
    if (!out) { console.log(`${tag} no video in response:`, JSON.stringify(res.data).slice(0, 300)); return null }

    const dest = join(OUT, `GEN_${shot}.mp4`)
    await writeFile(dest, Buffer.from(await (await fetch(out)).arrayBuffer()))
    console.log(`${tag} → ${dest.replace(HERE + '/', '')}`)
    return dest
  } catch (e) {
    // fal returns a 422 listing the fields it actually wanted — print it verbatim.
    console.error(`${tag} FAILED: ${e.message}`)
    if (e.body) console.error(`${tag} ${JSON.stringify(e.body).slice(0, 600)}`)
    return null
  }
}))

const ok = results.filter(Boolean)
console.log(`\n${ok.length}/${shots.length} generated.`)
if (ok.length === shots.length && shots.length > 1) {
  console.log('\nNow the only question that matters: play them back to back.')
  console.log('Same room? Same two men? Same coat, same light? → the thesis holds.')
}
