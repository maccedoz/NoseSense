'use client'

import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Wand2, Loader2 } from 'lucide-react'

export function OpenResultsTable() {
  const { openResults, openStatus } = useAppStore()

  if (openStatus === 'idle' && openResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 opacity-30" />
        <p className="text-sm">Run the Open Prompt process to see live results here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
      {openResults.length === 0 && openStatus === 'running' && (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Waiting for results...</span>
        </div>
      )}

      {[...openResults].reverse().map((result, idx) => (
        <div
          key={result.id}
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border text-sm animate-fade-in transition-all",
            result.isCorrect
              ? "bg-green-500/5 border-green-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}
          style={{ animationDelay: `${idx * 0.02}s` }}
        >
          <div className="mt-0.5">
            {result.isCorrect ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground truncate">{result.modelName}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{result.testType}</Badge>
              {result.wasNormalized && (
                <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
                  <Wand2 className="w-2.5 h-2.5" />
                  Normalized
                </Badge>
              )}
            </div>

            <div className="space-y-0.5">
              {result.wasNormalized && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Raw:</span>{' '}
                  <span className="italic opacity-70">&ldquo;{result.rawResponse}&rdquo;</span>
                </p>
              )}
              <p className="text-xs">
                <span className="text-muted-foreground font-medium">Answer: </span>
                <span className={result.isCorrect ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {result.normalizedResponse}
                </span>
              </p>
            </div>
          </div>

          <span className="text-[10px] text-muted-foreground shrink-0">#{result.testIndex}</span>
        </div>
      ))}
    </div>
  )
}
