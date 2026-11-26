'use client'

/* eslint-disable @next/next/no-img-element -- small partner avatars from Supabase storage */
import { useTranslation } from '@/contexts/TranslationContext'
import { Check, RefreshCw } from 'lucide-react'
import { endsNextDay, type PlannerTask } from '@/lib/planner/tasks'
import { taskLook, type RoleLike, type VisionLike } from '@/lib/planner/roleLinks'

type UserProfile = { id: string; name?: string; avatar_url?: string }

interface Props {
  tasks: PlannerTask[]            // already sorted by start
  userId: string | null
  completedTaskIds: string[]
  partnerCompletedIds: string[]
  rolesMap: Record<string, RoleLike>
  visionsMap: Record<string, VisionLike>
  goalTitles: Record<string, string>
  profilesMap: Record<string, UserProfile>
  onOpen: (task: PlannerTask) => void
  onToggle: (taskId: string) => void
}

// The day's events as cards: time, tick, title, role (and goal), or the partner who owns it
export default function DayTaskCards({ tasks, userId, completedTaskIds, partnerCompletedIds, rolesMap, visionsMap, goalTitles, profilesMap, onOpen, onToggle }: Props) {
  const { tr } = useTranslation()
  return (
    <>
      {tasks.map((task) => {
        const isPartnerTask = !!task.owner_id && task.owner_id !== userId
        const isDone = isPartnerTask ? partnerCompletedIds.includes(task.id) : completedTaskIds.includes(task.id)
        const vision = task.vision_id ? visionsMap[task.vision_id] : null
        const look = taskLook(task, rolesMap)
        const goalTitle = task.goal_id ? goalTitles[task.goal_id] : null
        const partner = isPartnerTask ? profilesMap[task.owner_id!] : null

        return (
          <div
            key={task.id}
            onClick={() => !isPartnerTask && onOpen(task)}
            style={look.style}
            className={`relative overflow-hidden rounded-3xl p-4 ${look.className} ${isDone ? 'opacity-60' : ''} ${!isPartnerTask ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'} transition-all shadow-sm`}
          >
            <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest tabular-nums">
                    {task.start} — {task.end}{endsNextDay(task) && ' (+1)'}
                  </span>
                  {task.recurring && <RefreshCw className="w-3 h-3 text-white/40" />}
                </div>
                {isPartnerTask ? (
                  isDone && (
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                      <Check className="w-3 h-3 text-slate-600 stroke-[3]" />
                    </div>
                  )
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(task.id) }}
                    aria-label={isDone ? tr('Mark not done') : tr('Mark done')}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-white border-white' : 'border-white/50 hover:border-white'}`}
                  >
                    {isDone && <Check className="w-3 h-3 text-slate-600 stroke-[3]" />}
                  </button>
                )}
              </div>

              <h3 className={`text-base font-black text-white leading-snug ${isDone ? 'line-through' : ''}`}>{task.text}</h3>

              {/* Role (and goal); older events show their vision */}
              {look.role && (
                <div className="mt-2 flex max-w-full items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 w-fit">
                  <span className="text-[10px]">{look.role.emoji ?? '🎯'}</span>
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">{tr(look.role.name)}</span>
                  {goalTitle && <span className="min-w-0 truncate text-[10px] font-semibold text-white/75 normal-case">· {goalTitle}</span>}
                </div>
              )}
              {!look.role && !task.role_id && vision && (
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 w-fit">
                  <span className="text-[10px]">{vision.emoji}</span>
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">{tr(vision.title)}</span>
                </div>
              )}

              {partner && (
                <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 w-fit">
                  {partner.avatar_url ? (
                    <img src={partner.avatar_url} alt={partner.name || tr('Partner')} className="w-3.5 h-3.5 rounded-full" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-white/30 flex items-center justify-center text-[7px] font-bold text-white">
                      {(partner.name || 'P')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">{partner.name || tr('Partner')}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
