'use client'

import { useAppStore } from '@/lib/store'
import { TEST_TYPES, CORRECT_ANSWERS, type TestType } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FinalResultsTable() {
  const { results, status } = useAppStore()

  if (status !== 'completed' || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <p className="text-sm">Execute o processo para ver os resultados finais.</p>
      </div>
    )
  }

  // Criar mapa de resultados por modelo e tipo de teste
  const resultsMap = new Map<string, Map<TestType, { status: 'success' | 'error'; answer?: string; errorMessage?: string }>>()
  
  results.forEach((result) => {
    const modelKey = `${result.providerName}/${result.modelName}`
    if (!resultsMap.has(modelKey)) {
      resultsMap.set(modelKey, new Map())
    }
    resultsMap.get(modelKey)!.set(result.testType, {
      status: result.status,
      answer: result.answer,
      errorMessage: result.errorMessage,
    })
  })

  // Obter lista unica de modelos que foram testados
  const testedModels = Array.from(resultsMap.keys())

  const downloadCSV = () => {
    const headers = ['Tipo de Teste', 'Resposta Correta', ...testedModels]
    const rows = TEST_TYPES.map((testType) => {
      const correctAnswer = CORRECT_ANSWERS[testType]
      const row = [testType, correctAnswer]
      testedModels.forEach((modelKey) => {
        const result = resultsMap.get(modelKey)?.get(testType)
        if (result) {
          row.push(result.status === 'success' ? (result.answer || '-') : `ERRO: ${result.errorMessage || 'Timeout'}`)
        } else {
          row.push('-')
        }
      })
      return row
    })

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `resultados-llm-benchmark-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{testedModels.length} modelo(s)</span>
          <span className="text-border">|</span>
          <span>{TEST_TYPES.length} tipos de teste</span>
        </div>
        <Button
          onClick={downloadCSV}
          variant="outline"
          size="sm"
          className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium bg-secondary/50 min-w-[180px]">
                  Tipo de Teste
                </TableHead>
                <TableHead className="text-muted-foreground font-medium bg-secondary/30 text-center min-w-[80px]">
                  Correta
                </TableHead>
                {testedModels.map((modelKey) => (
                  <TableHead 
                    key={modelKey} 
                    className="text-muted-foreground font-medium text-center min-w-[120px]"
                  >
                    {modelKey.split('/')[1]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEST_TYPES.map((testType, index) => {
                const correctAnswer = CORRECT_ANSWERS[testType]
                return (
                  <TableRow 
                    key={testType} 
                    className={cn(
                      "border-border hover:bg-secondary/30",
                      index % 2 === 0 ? 'bg-secondary/10' : ''
                    )}
                  >
                    <TableCell className="font-medium text-foreground bg-secondary/20 text-sm">
                      {testType}
                    </TableCell>
                    <TableCell className="text-center bg-secondary/10">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                        {correctAnswer}
                      </span>
                    </TableCell>
                    {testedModels.map((modelKey) => {
                      const result = resultsMap.get(modelKey)?.get(testType)
                      const isCorrect = result?.status === 'success' && result?.answer === correctAnswer
                      const isError = result?.status === 'error'
                      
                      return (
                        <TableCell key={`${testType}-${modelKey}`} className="text-center">
                          {result ? (
                            result.status === 'success' ? (
                              <span className={cn(
                                "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                                isCorrect 
                                  ? "bg-green-500/20 text-green-500" 
                                  : "bg-destructive/20 text-destructive"
                              )}>
                                {result.answer}
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-destructive font-medium">ERRO</span>
                                <span className="text-xs text-muted-foreground">Timeout</span>
                              </div>
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
