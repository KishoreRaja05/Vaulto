import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')

const icons = [
  { src: 'favicon.svg', out: 'pwa-192.png', size: 192 },
  { src: 'favicon.svg', out: 'pwa-512.png', size: 512 },
  { src: 'icon-full.svg', out: 'pwa-maskable-512.png', size: 512 },
  { src: 'icon-full.svg', out: 'apple-touch-icon.png', size: 180 },
]

for (const { src, out, size } of icons) {
  await sharp(path.join(publicDir, src), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, out))
  console.log(`Generated public/${out} (${size}x${size})`)
}
