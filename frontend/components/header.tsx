'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const handleThemeToggle = () => {
    setSpinning(true)
    setTheme(theme === 'dark' ? 'light' : 'dark')
    setTimeout(() => setSpinning(false), 500)
  }

  return (
    <header className="glass border-b border-border/50 sticky top-0 z-50">
      {/* Subtle gradient line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 flex items-center justify-center overflow-visible">
              <Image src="/logo.png" alt="Aries Lab Logo" width={56} height={56} className="object-contain scale-[1.3]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Aries Lab</p>
              <h1 className="text-lg font-bold text-foreground tracking-tight">NoseSense</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-secondary/80 border border-border/50 font-medium">
            v0.1.0
          </span>
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className="w-9 h-9 rounded-full hover:bg-primary/10 transition-all duration-300"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <div className={spinning ? 'animate-[spin-once_0.5s_ease-out]' : 'transition-transform duration-300'}>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </div>
          </Button>
        </div>
      </div>
    </header>
  )
}
