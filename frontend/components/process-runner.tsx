'use client'

import { useAppStore } from '@/lib/store'
import { TEST_TYPES, ANSWER_OPTIONS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProcessRunner() {
  const { status, progress, errors, setStatus, setProgress, addResult, addError, resetResults, getEnabledModels } = useAppStore()
  
  const enabledModels = getEnabledModels()
  
  const runProcess = async () => {
    if (enabledModels.length === 0) return
    
    resetResults()
    setStatus('running')
    setProgress(0)
    
    const totalSteps = enabledModels.length * TEST_TYPES.length
    let completedSteps = 0
    
    // Criar todas as promessas para rodar sincronamente (todas as LLMs ao mesmo tempo)
    const promises = enabledModels.flatMap(({ provider, model }) =>
      TEST_TYPES.map((testType) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            // Simulando sucesso/erro (15% chance de timeout)
            const isError = Math.random() < 0.15
            
            if (isError) {
              addError({
                modelName: model.name,
                providerName: provider.name,
                testType,
                message: 'API Timeout - A requisicao excedeu o tempo limite',
                timestamp: new Date(),
              })
              addResult({
                id: crypto.randomUUID(),
                modelName: model.name,
                providerName: provider.name,
                testType,
                status: 'error',
                errorMessage: 'API Timeout',
                timestamp: new Date(),
              })
            } else {
              // Gerar resposta aleatoria A-E
              const randomAnswer = ANSWER_OPTIONS[Math.floor(Math.random() * ANSWER_OPTIONS.length)]
              addResult({
                id: crypto.randomUUID(),
                modelName: model.name,
                providerName: provider.name,
                testType,
                status: 'success',
                answer: randomAnswer,
                timestamp: new Date(),
              })
            }
            
            completedSteps++
            setProgress((completedSteps / totalSteps) * 100)
            resolve()
          }, 300 + Math.random() * 700)
        })
      )
    )
    
    // Executar todas as promessas sincronamente
    await Promise.all(promises)
    
    setProgress(100)
    setStatus('completed')
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
      
      <Button
        onClick={runProcess}
        disabled={status === 'running' || enabledModels.length === 0}
        className={cn(
          "w-full",
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
    </div>
  )
}
