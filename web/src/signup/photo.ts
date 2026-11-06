export const PHOTO_MAX_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 512
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const PHOTO_ACCEPT = ACCEPTED.join(',')

/**
 * Validates an image file and downscales it to at most 512px on its longest side,
 * returning a JPEG data URL. Throws an Error with a user-facing message on failure.
 */
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Please choose a JPG, PNG, WebP, or GIF image.')
  if (file.size > PHOTO_MAX_BYTES) throw new Error('That photo is over 10 MB. Please choose a smaller one.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('We couldn’t read that image. Try a different photo.')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser couldn’t process that image.')
  ctx.fillStyle = '#ffffff' // flatten transparent PNGs onto white
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
