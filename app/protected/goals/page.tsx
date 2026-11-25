'use client'

import { useTranslation } from '@/contexts/TranslationContext'
import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Target,
  LayoutDashboard,
  Sparkles,
  Users,
  CalendarCheck,
} from 'lucide-react'
import { NewGoalForm, GoalCategory } from '@/components/goals/NewGoalForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { GoalList } from '@/components/goals/GoalList'
import { GoalsOverview } from '@/components/goals/GoalsOverview'
import LifeStatementCard from '@/components/goals/LifeStatementCard'
import RolesView from '@/components/goals/roles/RolesView'
import WeekView from '@/components/goals/roles/WeekView'
import { cn } from '@/lib/utils'
import { dueDate, inPeriod, isOverdue } from '@/lib/goals'
import { groupRolesByCategory, loadCategories, loadRoles, sortRoles, type Role, type RoleCategory } from '@/lib/roles'

type GoalView = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Vision {
  id: string
  title: string
  description?: string
  color: string
  emoji: string | null
  target_date: string | null
  is_archived: boolean
  created_at?: string
}

// Goals, organised Covey's way: Roles (each with a mission and vision) → Goals,
// with a weekly plan of big rocks per role. Your overall life mission and vision
// sit above everything, and older visions are kept under the Roles tab.
export default function GoalsPage() {
  const { tr } = useTranslation()
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [visions, setVisions] = useState<Vision[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [roleCategories, setRoleCategories] = useState<RoleCategory[]>([])
  const [rolesReady, setRolesReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newGoalRole, setNewGoalRole] = useState<string | undefined>(undefined)
  const [view, setView] = useState<GoalView>('monthly')
  const [tab, setTab] = useState('roles')
  // 'all', a role id, or 'unassigned' (your goals with no role yet)
  const [focusRole, setFocusRole] = useState<string>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)
    setCurrentUserId(user.id)

    // Roles load on their own, so the goals still show before the roles migration is run
    const [gRes, cRes, vRes, rRes] = await Promise.all([
      supabase
        .from('goals')
        .select('*, goal_categories(*), visions(*)')
        .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('goal_categories').select('*').eq('user_id', user.id),
      supabase.from('visions').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      loadRoles(supabase, user.id),
    ])

    setGoals(gRes.data ?? [])
    setCategories(cRes.data ?? [])
    setVisions(vRes.data ?? [])
    setRoles(rRes.roles)
    setRolesReady(rRes.ready)
    if (rRes.ready) setRoleCategories(await loadCategories(supabase, user.id, rRes.roles.length > 0))
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const uiCategories: GoalCategory[] = useMemo(
    () =>
      categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        emoji: c.emoji ?? undefined,
      })),
    [categories]
  )

  const activeRoles = useMemo(() => sortRoles(roles.filter(r => !r.is_archived)), [roles])
  const roleIds = useMemo(() => new Set(activeRoles.map(r => r.id)), [activeRoles])
  // Bumped to open the visions section on the Roles tab
  const [visionsSignal, setVisionsSignal] = useState(0)
  const focusGroups = useMemo(() => groupRolesByCategory(activeRoles, roleCategories), [activeRoles, roleCategories])

  // The focus role applies to the whole page: stats, charts and lists
  const focusGoals = useMemo(() => {
    if (focusRole === 'all') return goals
    if (focusRole === 'unassigned') return goals.filter(g => g.owner_id === currentUserId && !(g.role_id && roleIds.has(g.role_id)))
    return goals.filter(g => g.role_id === focusRole)
  }, [goals, focusRole, currentUserId, roleIds])

  const filteredGoals = useMemo(() => {
    return focusGoals.filter(g => {
      // Goals with no due date are always shown regardless of period
      const d = dueDate(g)
      if (!d) return true
      // Unfinished overdue goals stay visible until they're done
      if (isOverdue(g)) return true
      return inPeriod(d, view)
    })
  }, [focusGoals, view])

  // Roles with at least one goal due in the chosen period
  const rolesInPeriod = useMemo(
    () => new Set(filteredGoals.map(g => g.role_id).filter((id): id is string => !!id && roleIds.has(id))).size,
    [filteredGoals, roleIds],
  )

  const openNewGoal = (roleId?: string) => {
    setNewGoalRole(roleId ?? (focusRole !== 'all' && focusRole !== 'unassigned' ? focusRole : undefined))
    setShowNew(true)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground animate-pulse font-black uppercase">
        {tr('Loading Architecture')}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <header className="flex flex-col gap-4">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center gap-1 sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">
              {tr('Goals & Roles')}
            </h1>
            <HelpTip topic="goals.page" align="left" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {tr('"Write the vision and make it plain." Habakkuk 2:2')}
          </p>
        </div>

      </header>

      {/* Your overall mission and vision: optional, above every role */}
      <LifeStatementCard variant="goals" />

      {rolesReady && activeRoles.length > 0 && (
        <div className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-xl border border-dashed border-primary/20">
          <div className="flex justify-center sm:justify-start items-center gap-2 text-primary font-bold text-[10px] uppercase">
            <Sparkles className="w-4 h-4" />
            {tr('Focus role')}
            <HelpTip topic="goals.focus" align="left" className="-my-1" />
          </div>

          <Select value={focusRole} onValueChange={setFocusRole}>
            <SelectTrigger className="w-full h-10 font-bold">
              <SelectValue placeholder={tr('All roles')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr('All roles')}</SelectItem>
              {focusGroups.map(g => g.roles.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.emoji} {tr(r.name)}
                </SelectItem>
              )))}
              <SelectItem value="unassigned">{tr('Unassigned goals')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 h-14">
          <TabsTrigger value="overview" className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase py-1">
            <LayoutDashboard className="w-4 h-4" />
            {tr('Overview')}
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase py-1">
            <Users className="w-4 h-4" />
            {tr('Roles')}
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase py-1">
            <Target className="w-4 h-4" />
            {tr('Goals')}
          </TabsTrigger>
          <TabsTrigger value="week" className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase py-1">
            <CalendarCheck className="w-4 h-4" />
            {tr('Week')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <GoalsOverview
            goals={focusGoals}
            visions={visions}
            categories={uiCategories}
            onOpenVisions={() => { setTab('roles'); setVisionsSignal(n => n + 1) }}
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          {currentUserId && (
            <RolesView
              userId={currentUserId}
              ready={rolesReady}
              roles={roles}
              roleCategories={roleCategories}
              openVisions={visionsSignal}
              goals={goals}
              visions={visions}
              categories={uiCategories}
              onRolesChange={setRoles}
              onCategoriesChange={setRoleCategories}
              onGoalsMoved={(ids, roleId) => setGoals(gs => gs.map(g => (ids.includes(g.id) ? { ...g, role_id: roleId } : g)))}
              onAddGoal={roleId => openNewGoal(roleId)}
              onRefresh={loadAll}
            />
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {/* Period summary cards */}
          <div className="flex items-center gap-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tr('Goals due')}</p>
            <HelpTip topic="goals.list" align="left" className="-my-1" />
          </div>
          <div className="flex bg-muted/40 p-1 rounded-2xl gap-1">
            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all',
                  view === v
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tr(v)}
              </button>
            ))}
          </div>

          {/* Period summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-4 shadow-lg shadow-violet-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{tr(view)}</span>
              </div>
              <p className="text-3xl font-black text-white leading-none">{filteredGoals.length}</p>
              <p className="text-[10px] font-bold text-white/55 uppercase tracking-wide mt-0.5">{tr('goals')}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold">{tr('✓ {length} done', { length: filteredGoals.filter(g => g.status === 'done').length })}</span>
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold">{tr('▶ {length} doing', { length: filteredGoals.filter(g => g.status === 'doing').length })}</span>
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold">{tr('◯ {length} todo', { length: filteredGoals.filter(g => g.status === 'to_do').length })}</span>
              </div>
            </div>

            <button
              onClick={() => setTab('roles')}
              className="rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 p-4 text-left shadow-lg shadow-indigo-500/20"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{tr(view)}</span>
              </div>
              <p className="text-3xl font-black text-white leading-none">{rolesInPeriod}<span className="text-lg text-white/60">/{activeRoles.length}</span></p>
              <p className="text-[10px] font-bold text-white/55 uppercase tracking-wide mt-0.5">{tr('roles')}</p>
              <p className="text-xs font-semibold text-white/70 mt-3 leading-tight">{tr('With goals due in this period')}</p>
            </button>
          </div>

          <GoalList
              goals={filteredGoals}
              visions={visions}
              categories={uiCategories}
              currentUserId={currentUserId}
              onUpdated={goal =>
                setGoals(g => g.map(x => (x.id === goal.id ? goal : x)))
              }
              onDeleted={id => setGoals(g => g.filter(x => x.id !== id))}
            />

          {/* FAB – New Goal */}
          <button
            onClick={() => openNewGoal()}
            className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white shadow-lg shadow-violet-500/40 flex items-center justify-center transition-all"
            aria-label={tr('New Goal')}
          >
            <Plus className="w-6 h-6" />
          </button>
        </TabsContent>

        <TabsContent value="week" className="space-y-6">
          {currentUserId && (
            <WeekView userId={currentUserId} ready={rolesReady} roles={roles} categories={roleCategories} goals={goals} />
          )}
        </TabsContent>
      </Tabs>

      {/* New goal: from the Goals tab, or "Goal for this role" on a role */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-xl uppercase tracking-tight">{tr('New Goal')}</DialogTitle>
            <DialogDescription className="sr-only">{tr('Create a new goal')}</DialogDescription>
          </DialogHeader>
          <NewGoalForm
            key={newGoalRole ?? 'none'}
            categories={uiCategories}
            visions={visions}
            roles={rolesReady ? roles : undefined}
            initialRoleId={newGoalRole}
            onCancel={() => setShowNew(false)}
            onCreated={g => {
              setGoals([g, ...goals])
              setShowNew(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

