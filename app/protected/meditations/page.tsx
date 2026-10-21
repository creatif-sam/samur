import { redirect } from 'next/navigation'

// Meditations live in the Feed's Meditations tab; keep old links working
export default function MeditationsPage(): never {
  redirect('/protected/posts?tab=meditations')
}
