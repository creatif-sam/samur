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
import { LogOut, Camera, Save, Users, Trash2, AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import UserProfilesList from '@/components/profile/UserProfilesList'
import PushNotificationManager from '@/components/PushNotificationManager'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [goalStats, setGoalStats] = useState({ total: 0, completed: 0 })
  const [postCount, setPostCount] = useState(0)
  const [availablePartners, setAvailablePartners] = useState<Profile[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteType, setDeleteType] = useState<'account' | 'data' | null>(null)

  const router = useRouter()
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
  
  // Create a unique path using a timestamp
  const path = `${profile.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file) // Remove upsert: true since the path is now unique

  if (error) {
    console.error("Upload error:", error)
    setUploading(false)
    return
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)

  if (data?.publicUrl) {
    await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', profile.id)

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

    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('owner_id', user.id)

    const total = goals?.length || 0
    const completed = goals?.filter(g => g.status === 'done').length || 0
    setGoalStats({ total, completed })

    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', user.id)

    setPostCount(posts?.length || 0)
  }

  const fetchPartners = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('name')

    setAvailablePartners(data || [])
  }

  if (loading) {
    return <div className="p-6">Loading profile...</div>
  }

  return (
    <div className="min-h-screen bg-muted relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 bg-white/80 backdrop-blur-md"
      >
        <LogOut className="w-5 h-5" />
      </Button>

      {/* Hero background */}
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6D28D9] via-[#7C3AED] to-[#A78BFA]" />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 space-y-8">
        {/* Profile card */}
        <div
          className="bg-background rounded-2xl p-6 shadow-xl backdrop-blur-sm"
          style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="relative">
              <Avatar className="w-32 h-32 border-[5px] border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-3xl">
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
                variant="secondary"
                className="absolute bottom-1 right-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-3">
              {editing ? (
                <div className="flex gap-2">
                  <Input value={name} onChange={e => setName(e.target.value)} />
                  <Button onClick={updateProfile}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">{name || 'Unnamed User'}</h1>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                </div>
              )}

              <div className="flex gap-10 pt-4">
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

        {/* Partner card */}
        <div className="bg-background rounded-2xl p-6 shadow">
          <Label className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            Partner
          </Label>

          <Select
            value={selectedPartnerId || 'none'}
            onValueChange={value =>
              updatePartner(value === 'none' ? '' : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No partner</SelectItem>
              {availablePartners.map(partner => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name || 'Unnamed User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <BusinessCardSection />
        <PushNotificationManager />
        <UserProfilesList />

        {/* Account & Data Management */}
        <div className="bg-background rounded-2xl p-6 shadow border-2 border-destructive/20">
          <Label className="flex items-center gap-2 mb-4 text-destructive">
            <Trash2 className="w-4 h-4" />
            Account & Data Management
          </Label>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                onClick={() => {
                  setDeleteType('data')
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Specific Data
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setDeleteType('account')
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              These actions are permanent and comply with GDPR requirements
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deleteType === 'account' ? 'Delete Account' : 'Delete Specific Data'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'account' ? (
                <>
                  You are about to permanently delete your entire account. This will remove:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Your profile and all personal information</li>
                    <li>All goals, posts, meditations, and notes</li>
                    <li>All planner data and partner connections</li>
                  </ul>
                  <p className="mt-3 font-semibold">
                    You will need to confirm your name on the next page. Do you want to continue?
                  </p>
                </>
              ) : (
                <>
                  You can select specific types of data to delete while keeping your account active.
                  <p className="mt-3 font-semibold">
                    Do you want to continue to the data selection page?
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteType(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteDialog(false)
                if (deleteType === 'account') {
                  router.push('/protected/delete-account')
                } else {
                  router.push('/protected/delete-data')
                }
                setDeleteType(null)
              }}
              className={deleteType === 'account' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}