import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'note-images'
const MAX_SIDE = 1600
const MAX_BYTES = 12 * 1024 * 1024

// Downscale large photos (phones take 4000px+ images) to keep notes light
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}

// Uploads a photo into the user's own folder and returns its public URL
export async function uploadNoteImage(supabase: SupabaseClient, userId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file')
  if (file.size > MAX_BYTES) throw new Error('That image is too large (max 12 MB)')
  const blob = await compress(file)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || file.type,
    cacheControl: '31536000',
  })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
