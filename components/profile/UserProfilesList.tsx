'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_seen: string | null;
  online: boolean;
  partner_name: string | null;
  is_you: boolean;
};

// Admin-only list of every account (data comes from /api/admin/users)
export default function UserProfilesList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/admin/users')
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load users');
        setUsers(data.users ?? []);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load users'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q));
  }, [users, query]);

  if (loading) return <div className="text-center py-4 text-sm text-muted-foreground">Loading users…</div>;
  if (error) return <p className="text-sm text-destructive py-2">{error}</p>;

  const onlineCount = users.filter(u => u.online).length;
  const pairedCount = users.filter(u => u.partner_name).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Users', value: users.length },
          { label: 'Online now', value: onlineCount },
          { label: 'With partner', value: pairedCount },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-muted/50 py-2">
            <p className="text-lg font-black leading-tight">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="w-full rounded-2xl bg-muted/50 pl-9 pr-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
          <Users className="w-4 h-4" /> No users match.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {filtered.map(u => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url ?? undefined} alt={u.name || 'User'} />
                  <AvatarFallback>{(u.name || u.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {u.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" aria-label="Online" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {u.name || 'No name'}{u.is_you && <span className="text-muted-foreground font-normal"> (you)</span>}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {u.online ? 'Online now' : u.last_seen ? `Seen ${formatDistanceToNow(new Date(u.last_seen), { addSuffix: true })}` : 'Never seen'}
                  {' · '}Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  {u.partner_name && ` · 🤝 ${u.partner_name}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
