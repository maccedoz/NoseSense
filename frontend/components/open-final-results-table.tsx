'use client'

import { useAppStore } from '@/lib/store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OpenFinalResultsTable() {
  const { openResults } = useAppStore()

  if (openResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground animate-fade-in">
        <p className="text-sm">Run the Open Prompt process to see the results.</p>
      </div>
    )
  }

  // Group by test index
  type TestData = {
    testType: string
    results: Map<string, { rawResponse: string; normalizedResponse: string; wasNormalized: boolean; isCorrect: boolean }>
  }
  const testsByIndexMap = new Map<number, TestData>()
  const testedModelsSet = new Set<string>()

  openResults.forEach((result) => {
    const tIndex = result.testIndex ?? testsByIndexMap.size + 1
    if (!testsByIndexMap.has(tIndex)) {
      testsByIndexMap.set(tIndex, { testType: result.testType, results: new Map() })
    }
    const modelKey = `${result.providerName}/${result.modelName}`
    testedModelsSet.add(modelKey)
    testsByIndexMap.get(tIndex)!.results.set(modelKey, {
      rawResponse: result.rawResponse,
      normalizedResponse: result.normalizedResponse,
      wasNormalized: result.wasNormalized,
      isCorrect: result.isCorrect,
    })
  })

  const testedModels = Array.from(testedModelsSet).sort()
  const allTestIds = Array.from(testsByIndexMap.keys()).sort((a, b) => a - b)

  const downloadCSV = () => {
    const headers = ['Index', 'Test Type', ...testedModels.flatMap(m => [`${m} — Raw`, `${m} — Normalized`, `${m} — Correct`])]
    const rows = allTestIds.map((testId) => {
      const data = testsByIndexMap.get(testId)!
      const row = [testId.toString(), data.testType]
      testedModels.forEach((modelKey) => {
        const r = data.results.get(modelKey)
        if (r) {
          row.push(r.rawResponse, r.normalizedResponse, r.isCorrect ? 'YES' : 'NO')
        } else {
          row.push('-', '-', '-')
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
    link.download = `resultados-open-prompt-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{testedModels.length} model(s)</span>
          <span className="text-border">|</span>
          <span>{allTestIds.length} tests</span>
        </div>
        <Button
          onClick={downloadCSV}
          variant="outline"
          size="sm"
          className="gap-2 border-primary/50 text-primary hover:bg-primary/10 hover:scale-[1.02] transition-all"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 glass shadow-[0_1px_3px_oklch(0_0_0_/_0.1)]">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium bg-secondary/50 min-w-[180px]">
                  Test Type
                </TableHead>
                {testedModels.map((modelKey) => (
                  <TableHead
                    key={modelKey}
                    className="text-muted-foreground font-medium text-center min-w-[160px]"
                  >
                    {modelKey.split('/')[1]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTestIds.map((testId, index) => {
                const data = testsByIndexMap.get(testId)!
                return (
                  <TableRow
                    key={testId}
                    className={cn(
                      "border-border hover:bg-secondary/40 transition-colors",
                      index % 2 === 0 ? 'bg-secondary/10' : ''
                    )}
                  >
                    <TableCell className="font-medium text-foreground bg-secondary/20 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">#{testId}</span>
                        <span>{data.testType}</span>
                      </div>
                    </TableCell>
                    {testedModels.map((modelKey) => {
                      const r = data.results.get(modelKey)
                      return (
                        <TableCell key={`${testId}-${modelKey}`} className="text-center">
                          {r ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn(
                                "inline-flex items-center justify-center px-2 py-0.5 rounded-full font-semibold text-xs transition-transform hover:scale-105",
                                r.isCorrect
                                  ? "bg-green-500/20 text-green-400 shadow-[0_0_8px_oklch(0.55_0.2_145_/_0.15)]"
                                  : "bg-destructive/20 text-destructive"
                              )}>
                                {r.normalizedResponse}
                              </span>
                              {r.wasNormalized && (
                                <Badge variant="secondary" className="text-[9px] gap-1 h-4 px-1">
                                  <Wand2 className="w-2 h-2" />
                                  normalized
                                </Badge>
                              )}
                              {r.wasNormalized && (
                                <span className="text-[9px] text-muted-foreground italic max-w-[130px] truncate" title={r.rawResponse}>
                                  &ldquo;{r.rawResponse}&rdquo;
                                </span>
                              )}
                            </div>
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
