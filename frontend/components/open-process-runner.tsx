'use client'
import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Play, CheckCircle2, XCircle, Loader2, Square, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function OpenProcessRunner() {
  const {
    openStatus, openProgress, providers,
    setOpenStatus, setOpenProgress, addOpenResult, resetOpenResults,
    getEnabledModels
  } = useAppStore()

  const eventSourceRef = useRef<EventSource | null>(null)
  const statsRef = useRef({ total: 0, completed: 0 })
  const enabledModels = getEnabledModels()
  const [showConfirm, setShowConfirm] = useState(false)
  const [testCount, setTestCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('http://localhost:8001/api/open-test-count')
      .then(r => r.json())
      .then(data => setTestCount(data.count))
      .catch(() => {})
  }, [])

  const handleStartClick = () => {
    if (enabledModels.length === 0) return
    setShowConfirm(true)
  }

  const runProcess = async () => {
    setShowConfirm(false)

    try {
      await fetch('http://localhost:8001/api/open-results', { method: 'DELETE' })
    } catch (e) {
      console.error("Erro ao limpar banco aberto:", e)
    }

    resetOpenResults()
    setOpenStatus('running')
    setOpenProgress(0)

    const activeModelNames = enabledModels
      .map(item => item.model.backendId)
      .filter((id): id is string => Boolean(id))
      .join(',')

    if (!activeModelNames) {
      setOpenStatus('error')
      return
    }

    const streamUrl = `http://localhost:8001/api/run-open-tests?models=${activeModelNames}`
    const eventSource = new EventSource(streamUrl)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'start') {
        statsRef.current.total = data.total_tests * data.models.length
        statsRef.current.completed = 0
      } else if (data.type === 'result') {
        let providerName = 'Unknown'
        let modelName = data.model_name
        for (const p of providers) {
          const prefix = p.name.toLowerCase().replace(/ /g, '_') + '_'
          if (data.model_name.startsWith(prefix)) {
            providerName = p.name
            modelName = data.model_name.slice(prefix.length)
            break
          }
        }

        const isApiError = ['TIMEOUT', 'API_ERROR', 'EMPTY_RESPONSE'].includes(data.normalized_response)

        addOpenResult({
          id: crypto.randomUUID(),
          modelName: modelName,
          providerName,
          testType: data.test_smell,
          testIndex: data.test_index,
          rawResponse: data.raw_response,
          normalizedResponse: data.normalized_response,
          wasNormalized: data.was_normalized,
          isCorrect: data.is_correct,
          status: isApiError ? 'error' : (data.is_correct ? 'success' : 'error'),
          timestamp: new Date(),
        })

        statsRef.current.completed += 1
        if (statsRef.current.total > 0) {
          setOpenProgress((statsRef.current.completed / statsRef.current.total) * 100)
        }
      } else if (data.type === 'complete') {
        setOpenProgress(100)
        setOpenStatus('completed')
        eventSource.close()
      } else if (data.type === 'cancelled') {
        setOpenStatus('idle')
        eventSource.close()
      } else if (data.type === 'error') {
        setOpenStatus('error')
        eventSource.close()
      }
    }

    eventSource.onerror = () => {
      setOpenStatus('error')
      eventSource.close()
      eventSourceRef.current = null
    }
  }

  const stopProcess = async () => {
    try {
      await fetch('http://localhost:8001/api/stop-open-tests', { method: 'POST' })
    } catch (e) {
      console.error('Failed to stop open tests:', e)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setOpenStatus('idle')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-primary" />
          Execution — Open Prompt
        </h3>
        {openStatus === 'completed' && (
          <span className="text-xs text-accent flex items-center gap-1 animate-fade-in">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )}
        {openStatus === 'error' && (
          <span className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
            <XCircle className="w-3 h-3" />
            Error
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleStartClick}
          disabled={openStatus === 'running' || enabledModels.length === 0}
          className={cn(
            "flex-1 transition-all duration-300",
            openStatus === 'running'
              ? "bg-secondary text-secondary-foreground"
              : "gradient-btn text-white border-0 hover:scale-[1.01]"
          )}
        >
          {openStatus === 'running' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Open Prompt
            </>
          )}
        </Button>

        {openStatus === 'running' && (
          <Button
            variant="destructive"
            onClick={stopProcess}
            className="px-3 transition-all duration-200 hover:scale-105"
            title="Stop Processing"
          >
            <Square className="w-4 h-4" />
          </Button>
        )}
      </div>

      {enabledModels.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Select at least one model to run
        </p>
      )}

      {enabledModels.length > 0 && openStatus === 'idle' && (
        <p className="text-xs text-muted-foreground text-center">
          {enabledModels.length} model(s) x {testCount ?? '...'} tests = {testCount != null ? enabledModels.length * testCount : '...'} executions
        </p>
      )}

      {openStatus !== 'idle' && (
        <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border animate-fade-in">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn("font-medium tabular-nums", openStatus === 'error' ? "text-destructive" : "text-foreground")}>
              {Math.round(openProgress)}%
            </span>
          </div>
          <Progress
            value={openProgress}
            className={cn("h-2.5 rounded-full", openStatus === 'error' && "[&>div]:bg-destructive bg-destructive/20")}
          />

          {(openStatus === 'completed' || openStatus === 'error') && (
            <div className="pt-2 animate-fade-in">
              <div className="flex items-center gap-2 text-sm">
                {openStatus === 'completed' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span className="text-foreground font-medium">Process completed!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive font-medium">Process interrupted with errors.</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear previous open-mode data?</AlertDialogTitle>
            <AlertDialogDescription>
              Running will clear all history from "results_open.db" and "results_open.csv". Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runProcess} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Clear and Run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
