'use client'
import { useRef, useState } from 'react'
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
      .filter(Boolean)
      .join(',')
  
    // Define a URL do stream injetando os modelos ativados para o python
    const streamUrl = activeModelNames 
        ? `http://localhost:8001/api/run-tests?models=${activeModelNames}`
        : 'http://localhost:8001/api/run-tests'

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
        
        // Se quisermos mapear provider, pegamos o prefixo (ex: openai_ -> OpenAI)
        let providerName = 'Desconhecido'
        if (data.model_name.startsWith('openai')) providerName = 'OpenAI'
        if (data.model_name.startsWith('togetherai')) providerName = 'TogetherAI'
        if (data.model_name.startsWith('google')) providerName = 'GoogleAI'
        
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
        setStatus('idle')
        eventSource.close()
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      setStatus('idle')
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
          Execucao
        </h3>
        {status === 'completed' && (
          <span className="text-xs text-accent flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Concluido
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
              Processando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Rodar Processo
            </>
          )}
        </Button>

        {status === 'running' && (
          <Button 
            variant="destructive" 
            onClick={stopProcess}
            className="px-3"
            title="Parar Processamento"
          >
            <Square className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {enabledModels.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Selecione ao menos um modelo para executar
        </p>
      )}
      
      {enabledModels.length > 0 && status === 'idle' && (
        <p className="text-xs text-muted-foreground text-center">
          {enabledModels.length} modelo(s) x {TEST_TYPES.length} testes = {enabledModels.length * TEST_TYPES.length} execucoes
        </p>
      )}
      
      {status !== 'idle' && (
        <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="text-foreground font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {status === 'completed' && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="text-foreground">Processo concluido!</span>
              </div>
              {errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="w-4 h-4" />
                  <span>{errors.length} erro(s) encontrado(s)</span>
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
            <AlertDialogTitle>Apagar dados anteriores?</AlertDialogTitle>
            <AlertDialogDescription>
              A execução de um novo teste irá limpar todo o histórico do banco de dados local "resultados.db" 
              e da planilha "resultado.csv". Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runProcess} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sim, Apagar e Rodar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
