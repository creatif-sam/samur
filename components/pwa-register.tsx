'use client'

import { useEffect, useState } from 'react'

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallUI, setShowInstallUI] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration)
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setShowInstallUI(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallUI(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'To install this app:\n\nOn iOS: Share > Add to Home Screen\nOn Android: Browser menu > Add to Home Screen'
      )
      return
    }

    const promptEvent = deferredPrompt as any
    promptEvent.prompt()
    const choiceResult = await promptEvent.userChoice

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted install')
    }

    setDeferredPrompt(null)
    setShowInstallUI(false)
  }

  if (isInstalled || !showInstallUI) return null

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg"
    >
      Install App
    </button>
  )
}
