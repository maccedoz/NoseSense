'use client'
import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { TEST_TYPES, ANSWER_OPTIONS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Play, CheckCircle2, XCircle, Loader2, Square } from 'lucide-react'
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

export function ProcessRunner() {
  const { status, progress, errors, setStatus, setProgress, addResult, addError, resetResults, getEnabledModels } = useAppStore()
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const statsRef = useRef({ total: 0, completed: 0 })
  const enabledModels = getEnabledModels()
  const [showConfirm, setShowConfirm] = useState(false)
  const [testCount, setTestCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('http://localhost:8001/api/test-count')
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
    
    // Limpar DB Back-end antes de rodar processamento 
    try {
      await fetch('http://localhost:8001/api/results', { method: 'DELETE' })
    } catch(e) {
      console.error("Erro ao limpar banco:", e)
    }

    resetResults()
    setStatus('running')
    setProgress(0)
    
    // Obter array de models ativados e mapeados para a chave nativa do backend
    const activeModelNames = enabledModels
      .map(item => item.model.backendId)
      .filter((id): id is string => Boolean(id))
      .join(',')

    // Segurança: se nenhum modelo tem backendId, algo está errado — bloquear em vez de rodar tudo
    if (!activeModelNames) {
      addError({
        modelName: 'Frontend',
        providerName: 'Sistema',
        testType: 'Unknown Test',
        message: 'No models with valid backend IDs. Please reload the page and re-select your models.',
        timestamp: new Date(),
      })
      setStatus('error')
      return
    }

    // Define a URL do stream injetando os modelos selecionados
    const streamUrl = `http://localhost:8001/api/run-tests?models=${activeModelNames}`

    // Connect to SSE Endpoint
    const eventSource = new EventSource(streamUrl)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'start') {
        console.log(`Iniciando testes: ${data.total_tests}`)
        // Total steps = number of tests * number of models being tested
        statsRef.current.total = data.total_tests * data.models.length
        statsRef.current.completed = 0
      } 
      
      else if (data.type === 'result') {
        const isError = data.answer === 'API_ERROR' || data.answer === 'TIMEOUT'
        
        // Map backend model_name prefix to frontend provider name
        let providerName = 'Unknown'
        if (data.model_name.startsWith('openai_')) providerName = 'OpenAI'
        else if (data.model_name.startsWith('togetherai_')) providerName = 'TogetherAI'
        else if (data.model_name.startsWith('google_')) providerName = 'GoogleAI'
        else if (data.model_name.startsWith('anthropic_')) providerName = 'AnthropicAI'
        
        if (isError) {
          addError({
            modelName: data.model_name,
            providerName: providerName,
            testType: data.test_smell,
            message: data.answer,
            timestamp: new Date(),
          })
        }
        
        addResult({
          id: crypto.randomUUID(),
          modelName: data.model_name,
          providerName: providerName,
          testType: data.test_smell,
          testIndex: data.test_index,
          correctAnswer: data.correct_answer,
          status: isError ? 'error' : 'success',
          answer: data.answer,
          timestamp: new Date(),
        })
        
        // Atualiza progresso
        statsRef.current.completed += 1
        if (statsRef.current.total > 0) {
           setProgress((statsRef.current.completed / statsRef.current.total) * 100)
        }
      } 
      
      else if (data.type === 'complete') {
        setProgress(100)
        setStatus('completed')
        eventSource.close()
      }
      
      else if (data.type === 'error') {
        addError({
          modelName: 'Backend',
          providerName: 'Sistema',
          testType: 'Unknown Test',
          message: data.message,
          timestamp: new Date(),
        })
        setStatus('error')
        eventSource.close()
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      addError({
        modelName: 'EventSource',
        providerName: 'Sistema',
        testType: 'Unknown Test',
        message: 'A conexão com o servidor foi perdida ou a API falhou.',
        timestamp: new Date(),
      })
      setStatus('error')
      eventSource.close()
      eventSourceRef.current = null
    }
  }

  const stopProcess = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStatus('idle')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Execution
        </h3>
        {status === 'completed' && (
          <span className="text-xs text-accent flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )}
        {status === 'error' && (
          <span className="text-xs text-destructive flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Error
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={handleStartClick}
          disabled={status === 'running' || enabledModels.length === 0}
          className={cn(
            "flex-1",
            status === 'running' 
              ? "bg-secondary text-secondary-foreground" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
        >
          {status === 'running' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Process
            </>
          )}
        </Button>

        {status === 'running' && (
          <Button 
            variant="destructive" 
            onClick={stopProcess}
            className="px-3"
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
      
      {enabledModels.length > 0 && status === 'idle' && (
        <p className="text-xs text-muted-foreground text-center">
          {enabledModels.length} model(s) x {testCount ?? '...'} tests = {testCount != null ? enabledModels.length * testCount : '...'} executions
        </p>
      )}
      
      {status !== 'idle' && (
        <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn("font-medium", status === 'error' ? "text-destructive" : "text-foreground")}>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className={cn("h-2", status === 'error' && "[&>div]:bg-destructive bg-destructive/20")}
          />
          
          {(status === 'completed' || status === 'error') && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {status === 'completed' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span className="text-foreground">Process completed!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive font-medium">Process interrupted with errors.</span>
                  </>
                )}
              </div>
              {errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="w-4 h-4" />
                  <span>{errors.length} error(s) found</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear previous data?</AlertDialogTitle>
            <AlertDialogDescription>
              Running a new test will clear all history from the local database "resultados.db" 
              and the spreadsheet "resultado.csv". Do you want to continue?
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
