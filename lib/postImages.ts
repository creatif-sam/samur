import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadImage } from '@/lib/notes/images'

// Photos on posts live in the public 'post-images' bucket, each person in their own
// folder (migration 20261124010000_post_images). Their file names are random, so a
// private post's photo can't be found without its link.

export const POST_IMAGE_BUCKET = 'post-images'
export const MAX_POST_PHOTOS = 4

export const uploadPostImage = (supabase: SupabaseClient, userId: string, file: File) =>
  uploadImage(supabase, POST_IMAGE_BUCKET, userId, file)

// "…/storage/v1/object/public/post-images/<user>/<file>.jpg" → "<user>/<file>.jpg"
export function storagePath(url: string, bucket = POST_IMAGE_BUCKET): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const at = url.indexOf(marker)
  if (at < 0) return null
  const path = decodeURIComponent(url.slice(at + marker.length).split(/[?#]/)[0])
  return path && !path.includes('..') ? path : null
}

// The server only accepts photos from this project's bucket, in the poster's own folder
export function isOwnPostImage(url: unknown, supabaseUrl: string, userId: string): url is string {
  if (typeof url !== 'string' || url.length > 600) return false
  let parsed: URL
  let base: URL
  try {
    parsed = new URL(url)
    base = new URL(supabaseUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return false
  if (parsed.origin !== base.origin) return false
  const path = storagePath(parsed.pathname)
  return !!path && path.split('/')[0] === userId && /^[^/]+\/[\w-]+\.[a-z0-9]{2,5}$/i.test(path)
}

// The photos a request may attach: valid ones only, no repeats, at most four
export function cleanPostImages(input: unknown, supabaseUrl: string, userId: string): string[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.filter(u => isOwnPostImage(u, supabaseUrl, userId)))].slice(0, MAX_POST_PHOTOS)
}

// Best effort: a photo left behind only takes up space
export async function deletePostImages(supabase: SupabaseClient, urls: string[] | null | undefined) {
  const paths = (urls ?? []).map(u => storagePath(u)).filter((p): p is string => !!p)
  if (!paths.length) return
  try { await supabase.storage.from(POST_IMAGE_BUCKET).remove(paths) } catch {}
}
