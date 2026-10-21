import type { SupabaseClient, User } from '@supabase/supabase-js'

// Admins are listed by email in the ADMIN_EMAILS environment variable
// (comma-separated). With it unset, nobody is an admin.
export function isAdmin(user: Pick<User, 'email'> | null | undefined) {
  const email = user?.email?.trim().toLowerCase()
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email)
}

// Every auth user, across pages (service client only)
export async function listAllUsers(service: SupabaseClient) {
  const users: User[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

export async function findUserByEmail(service: SupabaseClient, email: string) {
  const target = email.trim().toLowerCase()
  if (!target) return null
  return (await listAllUsers(service)).find(u => u.email?.toLowerCase() === target) ?? null
}
