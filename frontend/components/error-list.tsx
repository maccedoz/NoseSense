'use client'

import { useAppStore } from '@/lib/store'
import { AlertTriangle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ErrorList() {
  const { errors, status } = useAppStore()
  
  if (status === 'idle' || errors.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Erros Encontrados ({errors.length})
      </h3>
      <ScrollArea className="h-[150px] rounded-lg border border-destructive/30 bg-destructive/5">
        <div className="p-3 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="text-sm p-2 rounded bg-destructive/10 border border-destructive/20"
            >
              <p className="font-medium text-destructive">
                {error.modelName} ({error.providerName}) - {error.testType}
              </p>
              <p className="text-muted-foreground text-xs mt-1">{error.message}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
