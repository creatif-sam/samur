'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BusinessCardSection from '@/components/profile/BusinessCardSection'
import { useTranslation } from '@/contexts/TranslationContext'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  LogOut, Camera, Save, Users, Trash2, AlertTriangle, UserPlus, Check,
  X, Clock, Link2Off, ChevronRight, Globe, DollarSign, Bell, CreditCard,
  Shield, Pencil, Target, BookOpen, Eye, Crown, CalendarDays,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import UserProfilesList from '@/components/profile/UserProfilesList'
import PushNotificationManager from '@/components/PushNotificationManager'
import { useRouter } from 'next/navigation'
import { currencies } from '@/lib/currencies'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [goalStats, setGoalStats] = useState({ total: 0, completed: 0 })
  const [meditationCount, setMeditationCount] = useState(0)
  const [visionCount, setVisionCount] = useState(0)
  const [availablePartners, setAvailablePartners] = useState<Profile[]>([])
  const [incomingRequest, setIncomingRequest] = useState<{ id: string; from_user_id: string; from_name: string } | null>(null)
  const [outgoingRequest, setOutgoingRequest] = useState<{ id: string; to_user_id: string; to_name: string } | null>(null)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteTargetId, setInviteTargetId] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteType, setDeleteType] = useState<'account' | 'data' | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [yearTheme, setYearTheme] = useState('')
  const [yearScripture, setYearScripture] = useState('')
  const [monthTheme, setMonthTheme] = useState('')
  const [monthScripture, setMonthScripture] = useState('')
  const [savingTheme, setSavingTheme] = useState(false)

  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { language, setLanguage, t } = useTranslation()

  useEffect(() => {
    fetchProfile()
    fetchStats()
    fetchPartners()
    fetchPendingRequests()
    loadCurrency()
  }, [])

  const toggle = (key: string) => setExpanded(e => e === key ? null : key)

  /* â”€â”€ data fetching â”€â”€ */
  const fetchProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setName(data?.name || '')
    setLoading(false)
  }

  const fetchStats = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [goalsRes, medsRes, visionsRes] = await Promise.all([
      supabase.from('goals').select('status').eq('owner_id', user.id),
      supabase.from('meditations').select('id').eq('author_id', user.id),
      supabase.from('visions').select('id').eq('owner_id', user.id),
    ])
    const goals = goalsRes.data ?? []
    setGoalStats({ total: goals.length, completed: goals.filter(g => g.status === 'done').length })
    setMeditationCount(medsRes.data?.length ?? 0)
    setVisionCount(visionsRes.data?.length ?? 0)
  }

  const fetchPartners = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').neq('id', user.id).order('name')
    setAvailablePartners(data || [])
  }

  const fetchPendingRequests = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [incRes, outRes] = await Promise.all([
      supabase.from('partner_requests')
        .select('id, from_user_id, profiles!partner_requests_from_user_id_fkey(name)')
        .eq('to_user_id', user.id).eq('status', 'pending').limit(1).maybeSingle(),
      supabase.from('partner_requests')
        .select('id, to_user_id, profiles!partner_requests_to_user_id_fkey(name)')
        .eq('from_user_id', user.id).eq('status', 'pending').limit(1).maybeSingle(),
    ])
    if (incRes.data) {
      const p = incRes.data.profiles as any
      setIncomingRequest({ id: incRes.data.id, from_user_id: incRes.data.from_user_id, from_name: p?.name || 'Unknown' })
    }
    if (outRes.data) {
      const p = outRes.data.profiles as any
      setOutgoingRequest({ id: outRes.data.id, to_user_id: outRes.data.to_user_id, to_name: p?.name || 'Unknown' })
    }
  }

  const loadCurrency = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('user_preferences')
      .select('currency, year_theme, year_scripture, month_theme, month_scripture')
      .eq('user_id', user.id)
      .single()
    if (data?.currency)       setSelectedCurrency(data.currency)
    if (data?.year_theme)     setYearTheme(data.year_theme)
    if (data?.year_scripture) setYearScripture(data.year_scripture)
    if (data?.month_theme)    setMonthTheme(data.month_theme)
    if (data?.month_scripture) setMonthScripture(data.month_scripture)
  }

  const saveThemes = async () => {
    setSavingTheme(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingTheme(false); return }
    await supabase.from('user_preferences').upsert({
      user_id: user.id,
      year_theme: yearTheme,
      year_scripture: yearScripture,
      month_theme: monthTheme,
      month_scripture: monthScripture,
    })
    setSavingTheme(false)
    toast.success('Themes saved!')
  }

  const saveCurrency = async (code: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_preferences').upsert({ user_id: user.id, currency: code })
    setSelectedCurrency(code)
    toast.success('Currency updated')
  }

  /* â”€â”€ mutations â”€â”€ */
  const updateProfile = async () => {
    if (!profile) return
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ name }).eq('id', profile.id)
    if (!error) { setProfile({ ...profile, name }); setEditing(false) }
  }

  const uploadAvatar = async (file: File) => {
    if (!profile) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (error) { setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    if (data?.publicUrl) {
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: data.publicUrl })
    }
    setUploading(false)
  }

  const sendPartnerInvite = async () => {
    if (!inviteTargetId || !profile) return
    setSendingInvite(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSendingInvite(false); return }
    const { error } = await supabase.from('partner_requests').insert({ from_user_id: user.id, to_user_id: inviteTargetId })
    if (!error) {
      const target = availablePartners.find(p => p.id === inviteTargetId)
      setOutgoingRequest({ id: '', to_user_id: inviteTargetId, to_name: target?.name || 'Unknown' })
      setInviteTargetId('')
      toast.success('Invite sent!')
      fetch('/api/notifications/send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: inviteTargetId, title: 'New Partner Invite ðŸ¤', body: `${profile.name || 'Someone'} invited you to be their accountability partner.`, url: '/protected/profile' })
      }).catch(() => {})
    } else toast.error('Could not send invite')
    setSendingInvite(false)
  }

  const acceptInvite = async () => {
    if (!incomingRequest || !profile) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('partner_requests').update({ status: 'accepted' }).eq('id', incomingRequest.id)
    await supabase.from('profiles').update({ partner_id: incomingRequest.from_user_id }).eq('id', user.id)
    await supabase.from('profiles').update({ partner_id: user.id }).eq('id', incomingRequest.from_user_id)
    setProfile({ ...profile, partner_id: incomingRequest.from_user_id })
    setIncomingRequest(null)
    toast.success('Partner connected! ðŸŽ‰')
    fetch('/api/notifications/send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: incomingRequest.from_user_id, title: 'Invite Accepted! ðŸŽ‰', body: `${profile.name || 'Your invitee'} accepted your partner invite.`, url: '/protected/profile' })
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
    if (profile.partner_id) await supabase.from('profiles').update({ partner_id: null }).eq('id', profile.partner_id)
    setProfile({ ...profile, partner_id: undefined })
    toast.success('Partner disconnected')
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  )

  const partnerName = availablePartners.find(p => p.id === profile?.partner_id)?.name
  const completionPct = goalStats.total === 0 ? 0 : Math.round((goalStats.completed / goalStats.total) * 100)

  /* â”€â”€ partner section content â”€â”€ */
  const PartnerContent = () => (
    <div className="px-5 pb-4 pt-1 space-y-3">
      {profile?.partner_id ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 font-bold text-sm">
              {(partnerName ?? '?')[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{partnerName || 'Partner'}</p>
              <p className="text-xs text-muted-foreground">Connected âœ“</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 gap-1 text-xs" onClick={removePartner}>
            <Link2Off className="w-3 h-3" /> Disconnect
          </Button>
        </div>
      ) : incomingRequest ? (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center text-violet-700 font-bold text-xs">
              {incomingRequest.from_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{incomingRequest.from_name}</p>
              <p className="text-xs text-muted-foreground">Wants to be your partner</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1 bg-violet-600 hover:bg-violet-700 h-8 text-xs" onClick={acceptInvite}><Check className="w-3 h-3" /> Accept</Button>
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={declineInvite}><X className="w-3 h-3" /> Decline</Button>
          </div>
        </div>
      ) : outgoingRequest ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <div>
              <p className="text-xs font-semibold">Invite sent to {outgoingRequest.to_name}</p>
              <p className="text-[10px] opacity-70">Waiting for acceptanceâ€¦</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-xs" onClick={cancelOutgoingInvite}>Cancel</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={inviteTargetId} onValueChange={setInviteTargetId}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a personâ€¦" /></SelectTrigger>
            <SelectContent>{availablePartners.map(p => <SelectItem key={p.id} value={p.id}>{p.name || 'Unnamed'}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" className="w-full gap-1 bg-violet-600 hover:bg-violet-700 h-9 text-sm" onClick={sendPartnerInvite} disabled={!inviteTargetId || sendingInvite}>
            <UserPlus className="w-3.5 h-3.5" /> {sendingInvite ? 'Sendingâ€¦' : 'Send Invite'}
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/40 pb-28">

      {/* ── HERO HEADER ── */}
      <div className="relative h-52 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#A78BFA]" />
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-8 w-56 h-56 rounded-full bg-white/5" />
        {/* logout */}
        <button onClick={handleLogout} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <LogOut className="w-4 h-4 text-white" />
        </button>
        {/* Year theme overlay — shown in upper portion, above avatar overlap */}
        {yearTheme && (
          <div className="absolute inset-x-0 top-10 bottom-16 flex flex-col items-center justify-center px-14 text-center pointer-events-none">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Crown className="w-3 h-3 text-amber-300/80" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">
                Theme · {new Date().getFullYear()}
              </span>
            </div>
            <p className="text-white/90 text-sm font-black uppercase tracking-widest leading-tight drop-shadow-sm line-clamp-2">
              {yearTheme}
            </p>
            {yearScripture && (
              <p className="text-white/55 text-[10px] italic mt-1 line-clamp-1">{yearScripture}</p>
            )}
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4">

        {/* â”€â”€ AVATAR + NAME â”€â”€ */}
        <div className="flex flex-col items-center -mt-16 mb-6">
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-background shadow-xl">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-3xl font-black bg-violet-100 text-violet-600">
                {name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-violet-600 shadow-lg flex items-center justify-center"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          <div className="mt-3 text-center">
            {editing ? (
              <div className="flex items-center gap-2 mt-1">
                <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-center font-bold" autoFocus />
                <button onClick={updateProfile} className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0"><Save className="w-3.5 h-3.5 text-white" /></button>
                <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">{name || 'Unnamed User'}</h1>
                <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard2
            icon={<Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
            iconBg="bg-violet-50 dark:bg-violet-950/30"
            label="Goals"
            value={goalStats.total}
          />
          <StatCard2
            icon={<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/30"
            label="Completed"
            value={`${completionPct}%`}
          />
          <StatCard2
            icon={<BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-50 dark:bg-blue-950/30"
            label="Meditations"
            value={meditationCount}
          />
          <StatCard2
            icon={<Eye className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
            iconBg="bg-amber-50 dark:bg-amber-950/30"
            label="Visions"
            value={visionCount}
          />
        </div>
        {/* ── THEMES GROUP ── */}
        <div className="bg-background rounded-3xl shadow-sm overflow-hidden mb-4">
          <SettingsRow
            icon={<Crown className="w-4 h-4 text-amber-500" />}
            label="Theme of the Year"
            sublabel={yearTheme || 'Tap to set your year theme'}
            expanded={expanded === 'yearTheme'}
            onTap={() => toggle('yearTheme')}
          />
          {expanded === 'yearTheme' && (
            <div className="px-5 pb-4 pt-1 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Theme</p>
                <input
                  value={yearTheme}
                  onChange={e => setYearTheme(e.target.value)}
                  placeholder="e.g. Year of Excellence"
                  className="w-full h-9 px-3 rounded-xl border border-border bg-muted/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Scripture</p>
                <Textarea
                  value={yearScripture}
                  onChange={e => setYearScripture(e.target.value)}
                  placeholder="e.g. Isaiah 43:19 — Behold, I am doing a new thing…"
                  className="text-sm resize-none rounded-xl"
                  rows={2}
                />
              </div>
              <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 gap-1.5 h-9" onClick={saveThemes} disabled={savingTheme}>
                <Save className="w-3.5 h-3.5" /> {savingTheme ? 'Saving…' : 'Save Year Theme'}
              </Button>
            </div>
          )}

          <div className="h-px bg-border/50 mx-5" />

          <SettingsRow
            icon={<CalendarDays className="w-4 h-4 text-violet-500" />}
            label="Theme of the Month"
            sublabel={monthTheme || 'Tap to set your month theme'}
            expanded={expanded === 'monthTheme'}
            onTap={() => toggle('monthTheme')}
          />
          {expanded === 'monthTheme' && (
            <div className="px-5 pb-4 pt-1 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Theme</p>
                <input
                  value={monthTheme}
                  onChange={e => setMonthTheme(e.target.value)}
                  placeholder="e.g. Month of Deep Prayer"
                  className="w-full h-9 px-3 rounded-xl border border-border bg-muted/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Scripture</p>
                <Textarea
                  value={monthScripture}
                  onChange={e => setMonthScripture(e.target.value)}
                  placeholder="e.g. Phil 4:13 — I can do all things through Christ…"
                  className="text-sm resize-none rounded-xl"
                  rows={2}
                />
              </div>
              <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 gap-1.5 h-9" onClick={saveThemes} disabled={savingTheme}>
                <Save className="w-3.5 h-3.5" /> {savingTheme ? 'Saving…' : 'Save Month Theme'}
              </Button>
            </div>
          )}
        </div>
        {/* â”€â”€ SETTINGS GROUP 1 â”€â”€ */}
        <div className="bg-background rounded-3xl shadow-sm overflow-hidden mb-4">
          {/* Partner */}
          <SettingsRow
            icon={<Users className="w-4 h-4" />}
            label="Accountability Partner"
            sublabel={profile?.partner_id ? partnerName || 'Connected' : incomingRequest ? '1 invite pending' : outgoingRequest ? 'Invite sent' : 'None'}
            expanded={expanded === 'partner'}
            onTap={() => toggle('partner')}
          />
          {expanded === 'partner' && <PartnerContent />}

          <div className="h-px bg-border/50 mx-5" />

          {/* Language */}
          <SettingsRow
            icon={<Globe className="w-4 h-4" />}
            label="Language"
            sublabel={language === 'en' ? 'English' : 'FranÃ§ais'}
            expanded={expanded === 'language'}
            onTap={() => toggle('language')}
          />
          {expanded === 'language' && (
            <div className="px-5 pb-4 pt-1">
              <LanguageSwitcher currentLanguage={language} onLanguageChange={setLanguage} />
            </div>
          )}

          <div className="h-px bg-border/50 mx-5" />

          {/* Currency */}
          <SettingsRow
            icon={<DollarSign className="w-4 h-4" />}
            label="Currency"
            sublabel={currencies.find(c => c.code === selectedCurrency)?.label || selectedCurrency}
            expanded={expanded === 'currency'}
            onTap={() => toggle('currency')}
          />
          {expanded === 'currency' && (
            <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2">
              {currencies.map(c => (
                <button
                  key={c.code}
                  onClick={() => saveCurrency(c.code)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors',
                    selectedCurrency === c.code
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-border bg-muted text-foreground hover:border-violet-400'
                  )}
                >
                  <span>{c.symbol}</span> {c.code}
                  {selectedCurrency === c.code && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* â”€â”€ SETTINGS GROUP 2 â”€â”€ */}
        <div className="bg-background rounded-3xl shadow-sm overflow-hidden mb-4">
          {/* Business Card */}
          <SettingsRow
            icon={<CreditCard className="w-4 h-4" />}
            label="Business Card"
            expanded={expanded === 'bizcard'}
            onTap={() => toggle('bizcard')}
          />
          {expanded === 'bizcard' && (
            <div className="px-5 pb-4 pt-1">
              <BusinessCardSection />
            </div>
          )}

          <div className="h-px bg-border/50 mx-5" />

          {/* Notifications */}
          <SettingsRow
            icon={<Bell className="w-4 h-4" />}
            label="Push Notifications"
            expanded={expanded === 'notifications'}
            onTap={() => toggle('notifications')}
          />
          {expanded === 'notifications' && (
            <div className="px-5 pb-4 pt-1">
              <PushNotificationManager />
            </div>
          )}
        </div>

        {/* â”€â”€ SETTINGS GROUP 3 â€” Danger â”€â”€ */}
        <div className="bg-background rounded-3xl shadow-sm overflow-hidden mb-4 border border-destructive/20">
          <SettingsRow
            icon={<Shield className="w-4 h-4 text-orange-500" />}
            label="Delete Specific Data"
            labelClass="text-orange-600 dark:text-orange-400"
            onTap={() => { setDeleteType('data'); setShowDeleteDialog(true) }}
          />
          <div className="h-px bg-border/50 mx-5" />
          <SettingsRow
            icon={<Trash2 className="w-4 h-4 text-destructive" />}
            label="Delete Account"
            labelClass="text-destructive"
            onTap={() => { setDeleteType('account'); setShowDeleteDialog(true) }}
          />
        </div>

        {/* All users list â€” dev/admin */}
        <div className="bg-background rounded-3xl shadow-sm overflow-hidden mb-4">
          <SettingsRow
            icon={<Users className="w-4 h-4" />}
            label="All Users"
            expanded={expanded === 'allusers'}
            onTap={() => toggle('allusers')}
          />
          {expanded === 'allusers' && (
            <div className="px-5 pb-4 pt-1">
              <UserProfilesList />
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full h-12 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>

        <p className="text-center text-[10px] text-muted-foreground/50 pb-2">
          {t.profile.gdprNote}
        </p>
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
                  You are about to permanently delete your entire account.
                  <p className="mt-2 font-semibold">Do you want to continue?</p>
                </>
              ) : (
                <>
                  Select specific types of data to delete while keeping your account active.
                  <p className="mt-2 font-semibold">Do you want to continue?</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteType(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteDialog(false)
                router.push(deleteType === 'account' ? '/protected/delete-account' : '/protected/delete-data')
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

function StatCard2({
  icon, iconBg, label, value,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string | number
}) {
  return (
    <div className="bg-background rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</span>
      </div>
      <div className="text-2xl font-black text-foreground">{value}</div>
    </div>
  )
}

function SettingsRow({
  icon, label, sublabel, expanded, onTap, labelClass,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  expanded?: boolean
  onTap: () => void
  labelClass?: string
}) {
  return (
    <button onClick={onTap} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={cn('text-sm font-semibold', labelClass)}>{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground truncate">{sublabel}</p>}
      </div>
      <ChevronRight className={cn('w-4 h-4 text-muted-foreground/50 transition-transform shrink-0', expanded && 'rotate-90')} />
    </button>
  )
}
