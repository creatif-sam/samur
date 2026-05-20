'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BusinessCardSection from '@/components/profile/BusinessCardSection'
import { useTranslation } from '@/contexts/TranslationContext'
import { LanguageSwitcher } from '@/components/language-switcher'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogOut, Camera, Save, Users, Trash2, AlertTriangle, UserPlus, Check, X, Clock, Link2Off } from 'lucide-react'
import { toast } from 'sonner'
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
  const [incomingRequest, setIncomingRequest] = useState<{ id: string; from_user_id: string; from_name: string; from_avatar?: string } | null>(null)
  const [outgoingRequest, setOutgoingRequest] = useState<{ id: string; to_user_id: string; to_name: string } | null>(null)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteTargetId, setInviteTargetId] = useState('')
  const [showInviteSelect, setShowInviteSelect] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteType, setDeleteType] = useState<'account' | 'data' | null>(null)

  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { language, setLanguage, t } = useTranslation()

  useEffect(() => {
    fetchProfile()
    fetchStats()
    fetchPartners()
    fetchPendingRequests()
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

  const fetchPendingRequests = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Incoming: someone invited me
    const { data: incoming } = await supabase
      .from('partner_requests')
      .select('id, from_user_id, profiles!partner_requests_from_user_id_fkey(name, avatar_url)')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()

    if (incoming) {
      const p = incoming.profiles as any
      setIncomingRequest({
        id: incoming.id,
        from_user_id: incoming.from_user_id,
        from_name: p?.name || 'Unknown',
        from_avatar: p?.avatar_url,
      })
    }

    // Outgoing: I invited someone
    const { data: outgoing } = await supabase
      .from('partner_requests')
      .select('id, to_user_id, profiles!partner_requests_to_user_id_fkey(name)')
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()

    if (outgoing) {
      const p = outgoing.profiles as any
      setOutgoingRequest({ id: outgoing.id, to_user_id: outgoing.to_user_id, to_name: p?.name || 'Unknown' })
    }
  }

  const sendPartnerInvite = async () => {
    if (!inviteTargetId || !profile) return
    setSendingInvite(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSendingInvite(false); return }

    const { error } = await supabase
      .from('partner_requests')
      .insert({ from_user_id: user.id, to_user_id: inviteTargetId })

    if (!error) {
      const target = availablePartners.find(p => p.id === inviteTargetId)
      setOutgoingRequest({ id: '', to_user_id: inviteTargetId, to_name: target?.name || 'Unknown' })
      setShowInviteSelect(false)
      setInviteTargetId('')
      toast.success('Invite sent!')
      // Push notify the target
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: inviteTargetId,
          title: 'New Partner Invite 🤝',
          body: `${profile.name || 'Someone'} invited you to be their accountability partner.`,
          url: '/protected/profile'
        })
      }).catch(() => {})
    } else {
      toast.error('Could not send invite')
    }
    setSendingInvite(false)
  }

  const acceptInvite = async () => {
    if (!incomingRequest || !profile) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Accept in DB
    await supabase.from('partner_requests').update({ status: 'accepted' }).eq('id', incomingRequest.id)
    // Link both users
    await supabase.from('profiles').update({ partner_id: incomingRequest.from_user_id }).eq('id', user.id)
    await supabase.from('profiles').update({ partner_id: user.id }).eq('id', incomingRequest.from_user_id)

    setProfile({ ...profile, partner_id: incomingRequest.from_user_id })
    setIncomingRequest(null)
    toast.success('Partner connected! 🎉')
    // Notify sender
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: incomingRequest.from_user_id,
        title: 'Invite Accepted! 🎉',
        body: `${profile.name || 'Your invitee'} accepted your partner invite.`,
        url: '/protected/profile'
      })
    }).catch(() => {})
  }

  const declineInvite = async () => {
    if (!incomingRequest) return
    const supabase = createClient()
    await supabase.from('partner_requests').update({ status: 'declined' }).eq('id', incomingRequest.id)
    setIncomingRequest(null)
    toast.success('Invite declined')
  }

  const cancelOutgoingInvite = async () => {
    if (!outgoingRequest) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('partner_requests').delete().eq('id', outgoingRequest.id)
    setOutgoingRequest(null)
    toast.success('Invite cancelled')
  }

  const removePartner = async () => {
    if (!profile) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ partner_id: null }).eq('id', user.id)
    if (profile.partner_id) {
      await supabase.from('profiles').update({ partner_id: null }).eq('id', profile.partner_id)
    }
    setProfile({ ...profile, partner_id: undefined })
    toast.success('Partner disconnected')
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
                    {t.profile.editProfile}
                  </Button>
                </div>
              )}

              <div className="flex gap-10 pt-4">
                <Stat label={t.profile.goals} value={goalStats.total} />
                <Stat
                  label={t.profile.completed}
                  value={
                    goalStats.total === 0
                      ? '0%'
                      : `${Math.round((goalStats.completed / goalStats.total) * 100)}%`
                  }
                />
                <Stat label={t.profile.posts} value={postCount} />
              </div>
            </div>
          </div>
        </div>

        {/* Partner card */}
        <div className="bg-background rounded-2xl p-6 shadow space-y-4">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Accountability Partner
          </Label>

          {/* Already has a partner */}
          {profile?.partner_id ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 font-bold">
                  {(availablePartners.find(p => p.id === profile.partner_id)?.name ?? '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{availablePartners.find(p => p.id === profile.partner_id)?.name || 'Partner'}</p>
                  <p className="text-xs text-muted-foreground">Connected ✓</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 gap-1" onClick={removePartner}>
                <Link2Off className="w-3.5 h-3.5" /> Disconnect
              </Button>
            </div>
          ) : incomingRequest ? (
            /* Incoming invite */
            <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center text-violet-700 font-bold text-sm">
                  {incomingRequest.from_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{incomingRequest.from_name}</p>
                  <p className="text-xs text-muted-foreground">Wants to be your partner</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1 bg-violet-600 hover:bg-violet-700" onClick={acceptInvite}>
                  <Check className="w-3.5 h-3.5" /> Accept
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={declineInvite}>
                  <X className="w-3.5 h-3.5" /> Decline
                </Button>
              </div>
            </div>
          ) : outgoingRequest ? (
            /* Outgoing pending invite */
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold">Invite sent to {outgoingRequest.to_name}</p>
                  <p className="text-xs opacity-70">Waiting for acceptance…</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={cancelOutgoingInvite}>
                Cancel
              </Button>
            </div>
          ) : showInviteSelect ? (
            /* Send invite UI */
            <div className="space-y-3">
              <Select value={inviteTargetId} onValueChange={setInviteTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a person…" />
                </SelectTrigger>
                <SelectContent>
                  {availablePartners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name || 'Unnamed'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1 bg-violet-600 hover:bg-violet-700" onClick={sendPartnerInvite} disabled={!inviteTargetId || sendingInvite}>
                  <UserPlus className="w-3.5 h-3.5" /> {sendingInvite ? 'Sending…' : 'Send Invite'}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowInviteSelect(false); setInviteTargetId('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* No partner, no pending */
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowInviteSelect(true)}>
              <UserPlus className="w-4 h-4" /> Invite a Partner
            </Button>
          )}
        </div>

        {/* Language Settings */}
        <div className="bg-background rounded-2xl p-6 shadow">
          <Label className="flex items-center gap-2 mb-3">
            {t.profile.language}
          </Label>
          <LanguageSwitcher currentLanguage={language} onLanguageChange={setLanguage} />
        </div>

        <BusinessCardSection />
        <PushNotificationManager />
        <UserProfilesList />

        {/* Account & Data Management */}
        <div className="bg-background rounded-2xl p-6 shadow border-2 border-destructive/20">
          <Label className="flex items-center gap-2 mb-4 text-destructive">
            <Trash2 className="w-4 h-4" />
            {t.profile.accountManagement}
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
                {t.profile.deleteData}
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
                {t.profile.deleteAccount}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t.profile.gdprNote}
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