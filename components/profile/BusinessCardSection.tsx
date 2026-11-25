'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import QRCode from 'react-qr-code'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function BusinessCardEditor() {
  const { tr } = useTranslation()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [title, setTitle] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return

    setUserId(data.user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (!profile) return

    setName(profile.name || '')
    setEmail(profile.email || '')
    setPhone(profile.phone || '')
    setLinkedin(profile.linkedin || '')
    setTitle(profile.business_title || '')
    setAvatarUrl(profile.avatar_url || null)
  }

  const save = async () => {
    if (!userId) return

    await supabase
      .from('profiles')
      .update({
        name,
        email,
        phone,
        linkedin,
        business_title: title,
      })
      .eq('id', userId)
  }

  const cardUrl =
    typeof window !== 'undefined' && userId
      ? `${window.location.origin}/card/${userId}`
      : ''

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">{tr('Edit Business Card')}</h2>

        <Label>{tr('Name')}</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />

        <Label>{tr('Title')}</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} />

        <Label>{tr('Email')}</Label>
        <Input value={email} onChange={e => setEmail(e.target.value)} />

        <Label>{tr('Mobile')}</Label>
        <Input value={phone} onChange={e => setPhone(e.target.value)} />

        <Label>{tr('LinkedIn')}</Label>
        <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} />

        <Button onClick={save} className="w-full">
          {tr('Save Card')}
        </Button>
      </Card>

      <Card className="p-6 space-y-4 text-center">
        <h3 className="text-lg font-semibold">{tr('Preview')}</h3>

        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/70 p-6 text-white space-y-3">
          <div className="flex justify-center">
            <Avatar className="w-20 h-20 border-4 border-white/80">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xl">
                {name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>

          <div>
            <p className="text-lg font-bold">{tr(name)}</p>
            <p className="text-sm opacity-90">{tr(title)}</p>
          </div>

          <div className="text-sm opacity-90 space-y-1">
            <p>{email}</p>
            <p>{phone}</p>
            <p>{linkedin}</p>
          </div>
        </div>

        {cardUrl && (
          <div className="flex justify-center pt-2">
            <QRCode value={cardUrl} size={140} />
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {tr('Scan to get contact details')}
        </p>
      </Card>
    </div>
  )
}
