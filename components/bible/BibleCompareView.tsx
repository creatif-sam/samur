'use client'

import { Loader2, X, Plus } from 'lucide-react'
import { TRANSLATIONS, displayBook, type Verse } from './bibleConstants'

interface Props {
  compareTranslations: string[]
  compareData: Map<string, Verse[]>
  compareLoadingSet: Set<string>
  compareVerseNums: number[]
  selectedBook: string
  selectedChapter: number
  translation: string
  fontSizeClass: string
  formatRef: (nums: number[]) => string
  removeCompareTranslation: (tid: string) => void
  showAddTranslation: boolean
  setShowAddTranslation: (v: boolean) => void
  addCompareTranslation: (tid: string) => void
}

export function BibleCompareView({
  compareTranslations, compareData, compareLoadingSet, compareVerseNums,
  selectedBook, selectedChapter, translation, fontSizeClass, formatRef,
  removeCompareTranslation, showAddTranslation, setShowAddTranslation, addCompareTranslation,
}: Props) {
  return (
    <>
      <div className="pb-40">
        {compareTranslations.map(tid => {
          const tInfo = TRANSLATIONS.find(t => t.id === tid)
          const verseObjs = compareData.get(tid) ?? []
          const isLoading = compareLoadingSet.has(tid)
          const refLabel = `${displayBook(selectedBook, tid)} ${formatRef(compareVerseNums)}`
          return (
            <div key={tid} className="px-4 pt-5 first:pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base font-black text-foreground shrink-0">{tInfo?.label ?? tid.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground font-medium truncate">{tInfo?.name}</span>
                </div>
                {compareTranslations.length > 1 && (
                  <button
                    onClick={() => removeCompareTranslation(tid)}
                    className="p-1.5 rounded-xl hover:bg-muted transition shrink-0 ml-2"
                    aria-label="Remove translation"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="border-l-4 border-violet-500 pl-4">
                {isLoading ? (
                  <div className="py-4 flex justify-start">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                  </div>
                ) : verseObjs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-3">Could not load this translation</p>
                ) : (
                  <p className={`${fontSizeClass} leading-[1.75] text-foreground`}>
                    {verseObjs.map(v => (
                      <span key={v.verse}>
                        <sup className="text-[10px] font-bold text-muted-foreground mr-0.5">{v.verse}</sup>
                        {v.text.trim()}{' '}
                      </span>
                    ))}
                  </p>
                )}
                {!isLoading && verseObjs.length > 0 && (
                  <p className="text-xs font-bold text-foreground mt-2">{refLabel}</p>
                )}
              </div>
              <div className="mt-5 border-b border-border" />
            </div>
          )
        })}
      </div>

      {/* ── Add version bar ── */}
      <div className="fixed bottom-16 left-0 right-0 z-[56] bg-background/95 backdrop-blur border-t border-border px-4 py-3">
        <button
          onClick={() => setShowAddTranslation(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-muted/60 transition text-sm font-bold text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400"
        >
          <Plus className="w-4 h-4" />
          Add Version
        </button>
      </div>

      {/* ── Add translation picker sheet ── */}
      {showAddTranslation && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowAddTranslation(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-3xl shadow-2xl border-t border-border animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-bold">Add Version</p>
              <button onClick={() => setShowAddTranslation(false)} className="p-1.5 rounded-xl hover:bg-muted transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto pb-8">
              {TRANSLATIONS.filter(t => !compareTranslations.includes(t.id)).map(t => (
                <button
                  key={t.id}
                  onClick={() => addCompareTranslation(t.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-muted/60 transition-colors"
                >
                  <span className="font-black text-[15px] w-16 text-foreground shrink-0">{t.label}</span>
                  <span className="text-sm text-muted-foreground flex-1 leading-snug">{t.name}</span>
                  <Plus className="w-4 h-4 text-violet-500 shrink-0" />
                </button>
              ))}
              {TRANSLATIONS.filter(t => !compareTranslations.includes(t.id)).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">All versions added</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
