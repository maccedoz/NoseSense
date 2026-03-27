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

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <p className="text-sm">Run the process to see the final results.</p>
      </div>
    )
  }

  // Extrai informações únicas de cada teste da execução (novo modelo suporta múltiplos itens)
  // Criamos um mapa onde a chave é o ID do Teste e o valor são as infos gerais e os resultados dos modelos.
  type TestData = { testType: string; correctAnswer: string; results: Map<string, { status: string; answer?: string; errorMessage?: string }> }
  const testsByIndexMap = new Map<number, TestData>()

  // Extrair também todos os modelos agrupados das keys do JSON 
  const testedModelsSet = new Set<string>()

  results.forEach((result) => {
    // Fallback: se o item do histórico for mto antigo e n tiver index geramos 1 pelo index do map
    const tIndex = result.testIndex ?? testsByIndexMap.size + 1 
    const cAnswer = (result.correctAnswer ?? CORRECT_ANSWERS[result.testType] ?? '-').toString()
    
    if (!testsByIndexMap.has(tIndex)) {
      testsByIndexMap.set(tIndex, { 
        testType: result.testType, 
        correctAnswer: cAnswer, 
        results: new Map() 
      })
    }

    const modelKey = `${result.providerName}/${result.modelName}`
    testedModelsSet.add(modelKey)

    testsByIndexMap.get(tIndex)!.results.set(modelKey, {
      status: result.status,
      answer: result.answer,
      errorMessage: result.errorMessage,
    })
  })

  // Transforma Sets em Arrays consistentes ordenados
  const testedModels = Array.from(testedModelsSet).sort()
  const allTestsExecutedIds = Array.from(testsByIndexMap.keys()).sort((a,b) => a - b)

  const downloadCSV = () => {
    const headers = ['Index', 'Test Type', 'Correct Answer', ...testedModels]
    
    const rows = allTestsExecutedIds.map((testId) => {
      const data = testsByIndexMap.get(testId)!
      const row = [testId.toString(), data.testType, data.correctAnswer]
      
      testedModels.forEach((modelKey) => {
        const result = data.results.get(modelKey)
        if (result) {
          row.push(result.status === 'success' ? (result.answer || '-') : `ERROR: ${result.errorMessage || 'Timeout'}`)
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
          <span>{testedModels.length} model(s)</span>
          <span className="text-border">|</span>
          <span>{TEST_TYPES.length} test types</span>
        </div>
        <Button
          onClick={downloadCSV}
          variant="outline"
          size="sm"
          className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium bg-secondary/50 min-w-[180px]">
                  Test Type
                </TableHead>
                <TableHead className="text-muted-foreground font-medium bg-secondary/30 text-center min-w-[80px]">
                  Correct
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
              {allTestsExecutedIds.map((testId, index) => {
                const data = testsByIndexMap.get(testId)!
                
                return (
                  <TableRow 
                    key={testId} 
                    className={cn(
                      "border-border hover:bg-secondary/30",
                      index % 2 === 0 ? 'bg-secondary/10' : ''
                    )}
                  >
                    <TableCell className="font-medium text-foreground bg-secondary/20 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">#{testId}</span>
                        <span>{data.testType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-secondary/10">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                        {data.correctAnswer}
                      </span>
                    </TableCell>
                    {testedModels.map((modelKey) => {
                      const result = data.results.get(modelKey)
                      const isCorrect = result?.status === 'success' && result?.answer === data.correctAnswer
                      
                      return (
                        <TableCell key={`${testId}-${modelKey}`} className="text-center">
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
                                <span className="text-xs text-destructive font-medium">ERROR</span>
                                <span className="text-xs text-muted-foreground" title={result.errorMessage}>API Failed</span>
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
