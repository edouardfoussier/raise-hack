// Renders the greybox scene headlessly and encodes one mp4 per (camera, pass).
//   node render.mjs            → all cameras, depth + beauty
//   node render.mjs wide       → just the master
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { extname, join } from 'node:path'
import { chromium } from 'playwright'

const HERE = import.meta.dirname
const OUT = join(HERE, 'out')
const PASSES = ['depth', 'beauty']

// ── ffmpeg (from the imageio-ffmpeg wheel — no apt needed) ──────────────────
const FFMPEG = await new Promise((res, rej) => {
  const p = spawn('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'])
  let o = ''
  p.stdout.on('data', d => (o += d))
  p.on('close', c => (c === 0 ? res(o.trim()) : rej(new Error('ffmpeg binary not found'))))
})

// ── static server: the page + three's ESM build ─────────────────────────────
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' }
const server = createServer(async (req, res) => {
  const url = req.url.split('?')[0]
  const file = url.startsWith('/three/')
    ? join(HERE, 'node_modules/three/build', url.slice(7))
    : join(HERE, url === '/' ? 'scene.html' : url)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const PORT = server.address().port

// ── headless chromium with software WebGL ───────────────────────────────────
// The image ships chromium at a pinned path; don't let playwright fetch its own.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
page.on('pageerror', e => console.error('  page error:', e.message))
await page.goto(`http://127.0.0.1:${PORT}/scene.html`)
await page.waitForFunction('window.__ready === true', null, { timeout: 60_000 })

const meta = await page.evaluate('window.__meta')
const cams = process.argv[2] ? [process.argv[2]] : meta.cameras
console.log(`scene ready — ${meta.W}x${meta.H}, ${meta.FRAMES} frames @ ${meta.FPS}fps`)
for (const [id, s] of Object.entries(meta.solved ?? {})) {
  console.log(`  ${id.padEnd(8)} ${s.shotSize.padEnd(3)} ${String(s.focal).padStart(3)}mm  d=${s.distance_m}m  fov=${s.fov}°`)
}
if (meta.coverage) {
  console.log(`  180°: ${meta.coverage.ok ? '✅ same side' : `❌ ${meta.coverage.crossed} camera(s) cross the line`}`)
}
console.log(`\nrendering: ${cams.join(', ')}\n`)

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const encode = (dir, dest) => new Promise((res, rej) => {
  const p = spawn(FFMPEG, [
    '-y', '-loglevel', 'error', '-framerate', String(meta.FPS),
    '-i', join(dir, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16',
    // even dimensions + faststart: fal's uploader is picky about odd sizes
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', dest,
  ])
  let err = ''
  p.stderr.on('data', d => (err += d))
  p.on('close', c => (c === 0 ? res() : rej(new Error(err))))
})

for (const cam of cams) {
  for (const pass of PASSES) {
    const dir = join(OUT, `${cam}_${pass}`)
    await mkdir(dir, { recursive: true })
    process.stdout.write(`  ${cam}/${pass} `)
    for (let f = 0; f < meta.FRAMES; f++) {
      const url = await page.evaluate(([c, i, p]) => window.__render(c, i, p), [cam, f, pass])
      await writeFile(join(dir, `f${String(f).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'))
      if (f % 12 === 0) process.stdout.write('.')
    }
    const mp4 = join(OUT, `${cam}_${pass}.mp4`)
    await encode(dir, mp4)
    await rm(dir, { recursive: true, force: true })
    console.log(` → ${mp4.replace(HERE + '/', '')}`)
  }
}

await browser.close()
server.close()
console.log(`\ndone — ${cams.length * PASSES.length} clips in derisk/out/`)
