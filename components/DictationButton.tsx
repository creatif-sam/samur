'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'

// Minimal typing for the Web Speech API (not in the TS DOM lib everywhere)
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Speak instead of typing. Hidden where the browser has no speech recognition.
export default function DictationButton({ onText, className = '', lang }: {
  onText: (text: string) => void
  className?: string
  lang?: string
}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<Recognition | null>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  useEffect(() => {
    setSupported(!!recognitionClass())
    return () => recRef.current?.stop()
  }, [])

  if (!supported) return null

  function toggle() {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const Rec = recognitionClass()
    if (!Rec) return
    const rec = new Rec()
    rec.lang = lang || navigator.language || 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) onTextRef.current(result[0].transcript.trim())
      }
    }
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast.error('Allow microphone access to use voice input')
      else if (e.error !== 'no-speech' && e.error !== 'aborted') toast.error('Voice input stopped')
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Stop voice input' : 'Speak to type'}
      aria-pressed={listening}
      className={`inline-flex items-center justify-center rounded-full transition ${listening ? 'bg-rose-500 text-white animate-pulse' : 'text-muted-foreground hover:bg-muted'} ${className}`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}

// Append dictated text to an existing value with sensible spacing
export function appendDictation(current: string, addition: string) {
  if (!addition) return current
  if (!current.trim()) return addition.charAt(0).toUpperCase() + addition.slice(1)
  return `${current.trimEnd()} ${addition}`
}
