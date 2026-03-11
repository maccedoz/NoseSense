'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle2, XCircle, Table } from 'lucide-react'
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

export function ResultsTable() {
  const { results, status } = useAppStore()
  
  const downloadCSV = () => {
    const headers = ['Modelo', 'Provedor', 'Tipo de Teste', 'Resultado', 'Erro', 'Data/Hora']
    const rows = results.map((result) => [
      result.modelName,
      result.providerName,
      result.testType,
      result.status === 'success' ? 'Sucesso' : 'Erro',
      result.errorMessage || '',
      result.timestamp.toISOString(),
    ])
    
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `benchmark-results-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <Table className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Nenhum resultado ainda</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Execute o processo para visualizar os resultados aqui em formato de planilha.
        </p>
      </div>
    )
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Table className="w-4 h-4" />
            Processamento ({results.length})
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-accent">
              <CheckCircle2 className="w-3 h-3" />
              {successCount} sucesso(s)
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="w-3 h-3" />
              {errorCount} erro(s)
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadCSV}
          disabled={results.length === 0}
          className="border-border text-foreground hover:bg-secondary"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>
      
      <div className="flex-1 rounded-lg border border-border overflow-hidden bg-card/50">
        <ScrollArea className="h-[400px]">
          <UITable>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium w-[80px]">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium">Modelo</TableHead>
                <TableHead className="text-muted-foreground font-medium">Tipo de Teste</TableHead>
                <TableHead className="text-muted-foreground font-medium">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id} className="border-border hover:bg-secondary/30">
                  <TableCell>
                    {result.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div>
                      {result.modelName}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({result.providerName})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {result.testType}
                  </TableCell>
                  <TableCell>
                    {result.status === 'success' ? (
                      <span className="text-accent">Sucesso</span>
                    ) : (
                      <span className="text-destructive">{result.errorMessage}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}
