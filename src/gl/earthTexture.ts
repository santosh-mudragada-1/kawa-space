import maskUrl from '../assets/earth-mask.jpg'

export interface EarthMask {
  w: number
  h: number
  data: Uint8ClampedArray
}

// working resolution for CPU sampling — the point cloud tops out around
// 22k points, so this is already ~40x oversampled relative to what's ever queried
const MASK_W = 2048
const MASK_H = 1024

/** Decodes the land/ocean mask to a raw pixel buffer so point placement can be sampled on the CPU before geometry is built. */
export function decodeEarthMask(): Promise<EarthMask> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = MASK_W
      canvas.height = MASK_H
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, MASK_W, MASK_H)
      const { data } = ctx.getImageData(0, 0, MASK_W, MASK_H)
      resolve({ w: MASK_W, h: MASK_H, data })
    }
    img.onerror = () => reject(new Error('earth mask failed to load'))
    img.src = maskUrl
  })
}

/** u,v in [0,1); returns land fraction 0 (ocean) .. 1 (land) from the red channel (source is greyscale). */
export function sampleMask(mask: EarthMask, u: number, v: number): number {
  const x = Math.min(mask.w - 1, Math.max(0, Math.floor(u * mask.w)))
  const y = Math.min(mask.h - 1, Math.max(0, Math.floor(v * mask.h)))
  return mask.data[(y * mask.w + x) * 4] / 255
}
