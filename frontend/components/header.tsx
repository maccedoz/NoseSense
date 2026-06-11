'use client'

import { Moon, Sun, FlaskConical, ListChecks } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const handleThemeToggle = () => {
    setSpinning(true)
    setTheme(theme === 'dark' ? 'light' : 'dark')
    setTimeout(() => setSpinning(false), 500)
  }

  const isOpen = pathname === '/open'

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

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-4 p-1 rounded-lg bg-secondary/50 border border-border/50">
            <Link href="/" id="nav-alternatives">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 text-xs font-medium transition-all duration-200 rounded-md",
                  !isOpen
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListChecks className="w-3.5 h-3.5" />
                Multiple Choice
              </Button>
            </Link>
            <Link href="/open" id="nav-open">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 text-xs font-medium transition-all duration-200 rounded-md",
                  isOpen
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Open Prompt
              </Button>
            </Link>
          </nav>
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
