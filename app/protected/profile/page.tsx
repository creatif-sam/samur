'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Camera, Save } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [goalStats, setGoalStats] = useState({ total: 0, completed: 0 });
  const [postCount, setPostCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(data);
    setName(data?.name || '');
    setLoading(false);
  };

  const updateProfile = async () => {
    if (!profile) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, name });
      setEditing(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!profile) return;

    setUploading(true);
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}.${fileExt}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (error) {
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    if (data?.publicUrl) {
      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile.id);

      setProfile({ ...profile, avatar_url: data.publicUrl });
    }

    setUploading(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const fetchStats = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('owner_id', user.id);

    const total = goals?.length || 0;
    const completed = goals?.filter(g => g.status === 'done').length || 0;
    setGoalStats({ total, completed });

    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', user.id);

    setPostCount(posts?.length || 0);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="relative p-4 space-y-6">
      {/* Top right logout icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="absolute top-4 right-4"
      >
        <LogOut className="w-5 h-5" />
      </Button>

      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Change Photo'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            {editing ? (
              <div className="flex gap-2">
                <Input value={name} onChange={e => setName(e.target.value)} />
                <Button size="sm" onClick={updateProfile}>
                  <Save className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span>{name || 'No name set'}</span>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-muted-foreground">{profile?.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Total Goals</span>
            <span>{goalStats.total}</span>
          </div>
          <div className="flex justify-between">
            <span>Completed Goals</span>
            <span>
              {goalStats.total === 0
                ? '0%'
                : ((goalStats.completed / goalStats.total) * 100).toFixed(2) + '%'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total Posts</span>
            <span>{postCount}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
