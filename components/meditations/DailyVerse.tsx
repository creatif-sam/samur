'use client'

import { HelpTip } from '@/components/ui/help-tip'
import { useEffect, useState } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'

export default function DailyVerseCard() {
  const [verse, setVerse] = useState({ text: "...", ref: "..." })
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVerse() {
      try {
        const res = await fetch('https://beta.ourmanna.com/api/v1/get/?format=json&order=daily')
        const data = await res.json()
        if (data?.verse?.details) {
          setVerse({ 
            text: data.verse.details.text, 
            ref: data.verse.details.reference 
          })
        }
      } catch (e) {
        setVerse({ 
          text: "Commit your work to the Lord, and your plans will be established.", 
          ref: "Proverbs 16:3" 
        })
      } finally {
        setLoading(false)
      }
    }
    fetchVerse()
  }, [])

  const copyToClipboard = () => {
    if (loading) return
    navigator.clipboard.writeText(`${verse.text} - ${verse.ref}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 dark:from-violet-700 dark:via-indigo-800 dark:to-slate-900 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden group border border-white/20 transition-all duration-500">
      
      {/* Background Decorative Elements */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-700" />
      <div className="absolute -left-10 -top-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Sparkles size={16} className="text-violet-100 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/80">Daily Bread</span>
              {copied && <span className="text-[9px] font-bold text-green-300 animate-in fade-in slide-in-from-left-1">Copied!</span>}
            </div>
            <HelpTip topic="home.dailyVerse" tone="onDark" align="left" />
          </div>
          
          <button 
            onClick={copyToClipboard}
            aria-label="Copy Scripture"
            className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-all active:scale-90 border border-white/5"
          >
            {copied ? (
              <Check size={16} className="text-green-300" />
            ) : (
              <Copy size={16} className="text-white/80" />
            )}
          </button>
        </div>

        <div className={`transition-opacity duration-500 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <p className="text-lg md:text-xl font-medium italic leading-relaxed tracking-tight text-white">
            "{verse.text.trim()}"
          </p>
          
          <div className="flex items-center gap-3 mt-5">
            <span className="w-8 h-[1.5px] bg-white/40 rounded-full" />
            <p className="text-xs font-black opacity-90 uppercase tracking-[0.15em] text-violet-100">
              {verse.ref}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}