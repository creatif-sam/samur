'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BusinessCardSection from '@/components/profile/BusinessCardSection'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogOut, Camera, Save, Users, Loader2 } from 'lucide-center' // Fixed lucide-react import name
import { LogOut as LogOutIcon, Camera as CameraIcon, Save as SaveIcon, Users as UsersIcon } from 'lucide-react'
import DisciplineVideosForm from '@/components/profile/DisciplineVideosForm'
import UserProfilesList from '@/components/profile/UserProfilesList'
import PushNotificationManager from '@/components/PushNotificationManager'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null) // State to store email from Auth
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [goalStats, setGoalStats] = useState({ total: 0, completed: 0 })
  const [postCount, setPostCount] = useState(0)
  const [availablePartners, setAvailablePartners] = useState<Profile[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    fetchProfile()
    fetchStats()
    fetchPartners()
  }, [])

  const fetchProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Email lives in auth.user, not typically in the public.profiles table
    setUserEmail(user.email ?? null)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(data)
    setName(data?.name || '')
    setSelectedPartnerId(data?.partner_id || '')
    setLoading(false)
  }

  const updateProfile = async () => {
    if (!profile) return
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, name })
      setEditing(false)
    }
  }

  const updatePartner = async (partnerId: string) => {
    if (!profile) return
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ partner_id: partnerId || null })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, partner_id: partnerId || undefined })
      setSelectedPartnerId(partnerId)
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!profile) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file)

    if (error) {
      console.error("Upload error:", error)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    if (data?.publicUrl) {
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: data.publicUrl })
    }
    setUploading(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const fetchStats = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: goals } = await supabase.from('goals').select('*').eq('owner_id', user.id)
    const total = goals?.length || 0
    const completed = goals?.filter(g => g.status === 'done').length || 0
    setGoalStats({ total, completed })

    const { data: posts } = await supabase.from('posts').select('*').eq('author_id', user.id)
    setPostCount(posts?.length || 0)
  }

  const fetchPartners = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('profiles').select('*').neq('id', user.id).order('name')
    setAvailablePartners(data || [])
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Preparing Profile</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 transition-colors duration-300">
      {/* Fixed Logout Overlay */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 rounded-full bg-background/50 backdrop-blur-md border border-border/40 hover:bg-muted"
      >
        <LogOutIcon className="w-5 h-5" />
      </Button>

      {/* Hero Header */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-black" />
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-24 space-y-6">
        {/* Profile Card */}
        <div className="bg-card dark:bg-zinc-900/60 backdrop-blur-xl rounded-[32px] p-8 border border-border shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-end gap-8">
            <div className="relative mx-auto sm:mx-0">
              <Avatar className="w-36 h-36 border-[6px] border-card shadow-2xl">
                <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="text-4xl font-black bg-muted">
                  {name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) uploadAvatar(file)
                }}
              />

              <Button
                size="icon"
                className="absolute bottom-1 right-1 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg border-4 border-card h-12 w-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CameraIcon className="w-5 h-5" />}
              </Button>
            </div>

            <div className="flex-1 space-y-6">
              {editing ? (
                <div className="flex gap-2">
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="rounded-xl bg-muted/50 border-none h-12 focus-visible:ring-violet-500"
                  />
                  <Button onClick={updateProfile} className="h-12 w-12 rounded-xl bg-violet-600">
                    <SaveIcon className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="h-12 rounded-xl border-border text-foreground">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">{name || 'Unnamed User'}</h1>
                    {/* Fixed build error: using userEmail state instead of profile.email */}
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{userEmail || 'SamUr Member'}</p>
                  </div>
                  <Button variant="outline" onClick={() => setEditing(true)} className="rounded-full border-border text-foreground">
                    Edit Profile
                  </Button>
                </div>
              )}

              <div className="flex gap-8 pt-4 justify-around sm:justify-start">
                <Stat label="Goals" value={goalStats.total} />
                <Stat
                  label="Completed"
                  value={
                    goalStats.total === 0
                      ? '0%'
                      : `${Math.round((goalStats.completed / goalStats.total) * 100)}%`
                  }
                />
                <Stat label="Posts" value={postCount} />
              </div>
            </div>
          </div>
        </div>

        {/* Partner Selection Card */}
        <div className="bg-card dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl p-6 border border-border">
          <Label className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <UsersIcon className="w-4 h-4 text-violet-500" />
            Connection Settings
          </Label>

          <Select
            value={selectedPartnerId || 'none'}
            onValueChange={value => updatePartner(value === 'none' ? '' : value)}
          >
            <SelectTrigger className="h-14 rounded-2xl bg-muted/50 border-none focus:ring-violet-500 text-foreground">
              <SelectValue placeholder="Select partner" />
            </SelectTrigger>
            <SelectContent 
              position="popper" 
              sideOffset={4} 
              className="rounded-2xl border-border z-[10000] bg-popover text-popover-foreground shadow-2xl"
            >
              <SelectItem value="none" className="rounded-xl">No partner linked</SelectItem>
              {availablePartners.map(partner => (
                <SelectItem key={partner.id} value={partner.id} className="rounded-xl">
                  {partner.name || 'Unnamed User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-3 text-[10px] text-muted-foreground italic px-1">
            Linking a partner allows you to share habits and goals automatically.
          </p>
        </div>

        <div className="grid gap-6">
          <BusinessCardSection />
          <DisciplineVideosForm />
          <PushNotificationManager />
          <UserProfilesList />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-2xl font-black text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">{label}</p>
    </div>
  )
}