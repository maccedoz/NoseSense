'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Grid3X3, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcessResult } from '@/lib/types'
import { CORRECT_ANSWERS } from '@/lib/types'

interface ConfusionMatrixProps {
  results: ProcessResult[]
}

interface PerClassMetric {
  className: string
  tp: number
  fp: number
  fn: number
  tn: number
  precision: number
  recall: number
  f1: number
  accuracy: number
}

interface ConfusionResult {
  labels: string[]
  matrix: number[][]
  perClassMetrics: PerClassMetric[]
  macroAvg: { precision: number; recall: number; f1: number; accuracy: number }
  totalSamples: number
}

function buildConfusionMatrix(subset: ProcessResult[], labels: string[]): ConfusionResult {
  const n = labels.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  subset.forEach(r => {
    if (r.status !== 'success' || !r.options || !r.answer) return
    const actual = r.testType
    const predicted = r.options[r.answer]
    if (!predicted) return

    const actualIdx = labels.indexOf(actual)
    const predictedIdx = labels.indexOf(predicted)
    if (actualIdx >= 0 && predictedIdx >= 0) {
      matrix[actualIdx][predictedIdx]++
    }
  })

  const totalSamples = matrix.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0)

  const perClassMetrics: PerClassMetric[] = labels.map((label, i) => {
    const tp = matrix[i][i]
    const fp = labels.reduce((sum, _, j) => sum + (j !== i ? matrix[j][i] : 0), 0)
    const fn = labels.reduce((sum, _, j) => sum + (j !== i ? matrix[i][j] : 0), 0)
    const tn = totalSamples - tp - fp - fn

    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0
    const accuracy = totalSamples > 0 ? (tp + tn) / totalSamples : 0

    return { className: label, tp, fp, fn, tn, precision, recall, f1, accuracy }
  })

  const validClasses = perClassMetrics.filter(m => (m.tp + m.fn) > 0)
  const macroPrecision = validClasses.length > 0 ? validClasses.reduce((s, m) => s + m.precision, 0) / validClasses.length : 0
  const macroRecall = validClasses.length > 0 ? validClasses.reduce((s, m) => s + m.recall, 0) / validClasses.length : 0
  const macroF1 = validClasses.length > 0 ? validClasses.reduce((s, m) => s + m.f1, 0) / validClasses.length : 0
  const overallAcc = totalSamples > 0 ? matrix.reduce((sum, row, i) => sum + row[i], 0) / totalSamples : 0

  return {
    labels, matrix, perClassMetrics,
    macroAvg: { precision: macroPrecision, recall: macroRecall, f1: macroF1, accuracy: overallAcc },
    totalSamples,
  }
}

export function ConfusionMatrix({ results }: ConfusionMatrixProps) {
  const [selectedModel, setSelectedModel] = useState('__all__')

  const { confusionByModel, modelKeys } = useMemo(() => {
    // Collect all unique smell labels
    const allLabels = new Set<string>()
    results.forEach(r => {
      if (r.testType) allLabels.add(r.testType)
      if (r.options && r.answer && r.status === 'success') {
        const predicted = r.options[r.answer]
        if (predicted) allLabels.add(predicted)
      }
    })
    const sortedLabels = Array.from(allLabels).sort()

    // Group by model
    const byModelResults = new Map<string, ProcessResult[]>()
    results.forEach(r => {
      const key = `${r.providerName}/${r.modelName}`
      if (!byModelResults.has(key)) byModelResults.set(key, [])
      byModelResults.get(key)!.push(r)
    })

    const confusionByModel = new Map<string, ConfusionResult>()
    byModelResults.forEach((modelResults, key) => {
      confusionByModel.set(key, buildConfusionMatrix(modelResults, sortedLabels))
    })
    confusionByModel.set('__all__', buildConfusionMatrix(results, sortedLabels))

    const modelKeys = ['__all__', ...Array.from(byModelResults.keys()).sort()]
    return { confusionByModel, modelKeys }
  }, [results])

  const cmData = confusionByModel.get(selectedModel) || confusionByModel.get('__all__')
  if (!cmData || cmData.totalSamples === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No data with options available for the confusion matrix. Run a new test to generate data.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxVal = Math.max(...cmData.matrix.flat(), 1)

  const getCellBg = (value: number, row: number, col: number) => {
    if (value === 0) return 'transparent'
    const intensity = Math.max(0.2, value / maxVal)
    if (row === col) return `rgba(34, 197, 94, ${intensity})`
    return `rgba(239, 68, 68, ${intensity})`
  }

  const fmt = (v: number) => (v * 100).toFixed(1) + '%'
  const colorByValue = (v: number) =>
    v >= 0.7 ? 'text-green-500' : v >= 0.5 ? 'text-yellow-500' : 'text-red-500'

  return (
    <>
      {/* Confusion Matrix Heatmap */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-primary" />
                Confusion Matrix
              </CardTitle>
              <CardDescription>Actual (rows) vs. Predicted (columns) test smell classification</CardDescription>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-sm bg-secondary border border-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {modelKeys.map(key => (
                <option key={key} value={key}>
                  {key === '__all__' ? 'All Models (Aggregated)' : key.split('/')[1]}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground font-medium border-b border-r border-border sticky left-0 bg-card z-10 min-w-[140px]">
                    Actual ↓ / Predicted →
                  </th>
                  {cmData.labels.map((label) => (
                    <th key={label} className="border-b border-border min-w-[40px] h-[160px] align-bottom" title={label}>
                      <div className="flex items-center justify-center h-full pb-2">
                        <span
                          className="text-muted-foreground font-medium whitespace-nowrap"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                          {label}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-center text-muted-foreground font-medium border-b border-l border-border min-w-[48px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {cmData.matrix.map((row, i) => {
                  const rowTotal = row.reduce((a, b) => a + b, 0)
                  return (
                    <tr key={i}>
                      <td className="p-2 text-left text-foreground font-medium border-b border-r border-border sticky left-0 bg-card z-10 whitespace-nowrap">
                        {cmData.labels[i]}
                      </td>
                      {row.map((value, j) => (
                        <td
                          key={j}
                          className="p-2 text-center border-b border-border font-mono font-bold"
                          style={{ backgroundColor: getCellBg(value, i, j) }}
                          title={`Actual: ${cmData.labels[i]}\nPredicted: ${cmData.labels[j]}\nCount: ${value}`}
                        >
                          <span className={value > 0 ? 'text-white' : 'text-muted-foreground/30'}>
                            {value}
                          </span>
                        </td>
                      ))}
                      <td className="p-2 text-center border-b border-l border-border font-mono text-muted-foreground">
                        {rowTotal}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Macro Averages */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase mb-1">Accuracy</p>
              <p className={cn("text-xl font-bold", colorByValue(cmData.macroAvg.accuracy))}>
                {fmt(cmData.macroAvg.accuracy)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase mb-1">Macro Precision</p>
              <p className={cn("text-xl font-bold", colorByValue(cmData.macroAvg.precision))}>
                {fmt(cmData.macroAvg.precision)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase mb-1">Macro Recall</p>
              <p className={cn("text-xl font-bold", colorByValue(cmData.macroAvg.recall))}>
                {fmt(cmData.macroAvg.recall)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase mb-1">Macro F1-Score</p>
              <p className={cn("text-xl font-bold", colorByValue(cmData.macroAvg.f1))}>
                {fmt(cmData.macroAvg.f1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Class Metrics Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Per-Class Metrics
          </CardTitle>
          <CardDescription>Precision, Recall, F1-Score and Accuracy for each test smell</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-muted-foreground font-medium">Class</th>
                  <th className="p-3 text-center text-muted-foreground font-medium">TP</th>
                  <th className="p-3 text-center text-muted-foreground font-medium">FP</th>
                  <th className="p-3 text-center text-muted-foreground font-medium">FN</th>
                  <th className="p-3 text-center text-muted-foreground font-medium">Precision</th>
                  <th className="p-3 text-center text-muted-foreground font-medium">Recall</th>
                  <th className="p-3 text-center text-muted-foreground font-medium">F1-Score</th>
                  <th className="p-3 text-center text-muted-foreground font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {cmData.perClassMetrics.map((m, i) => (
                  <tr
                    key={m.className}
                    className={cn(
                      "border-b border-border/50 hover:bg-secondary/30 transition-colors",
                      i % 2 === 0 ? 'bg-secondary/10' : ''
                    )}
                  >
                    <td className="p-3 text-foreground font-medium whitespace-nowrap">{m.className}</td>
                    <td className="p-3 text-center text-green-500 font-mono font-bold">{m.tp}</td>
                    <td className="p-3 text-center text-red-500 font-mono font-bold">{m.fp}</td>
                    <td className="p-3 text-center text-yellow-500 font-mono font-bold">{m.fn}</td>
                    <td className="p-3 text-center">
                      <span className={cn("font-bold", colorByValue(m.precision))}>{fmt(m.precision)}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn("font-bold", colorByValue(m.recall))}>{fmt(m.recall)}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn("font-bold", colorByValue(m.f1))}>{fmt(m.f1)}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn("font-bold", colorByValue(m.accuracy))}>{fmt(m.accuracy)}</span>
                    </td>
                  </tr>
                ))}
                {/* Macro Average Row */}
                <tr className="border-t-2 border-primary/50 bg-primary/5 font-bold">
                  <td className="p-3 text-primary">Macro Average</td>
                  <td className="p-3 text-center text-muted-foreground">—</td>
                  <td className="p-3 text-center text-muted-foreground">—</td>
                  <td className="p-3 text-center text-muted-foreground">—</td>
                  <td className="p-3 text-center text-primary">{fmt(cmData.macroAvg.precision)}</td>
                  <td className="p-3 text-center text-primary">{fmt(cmData.macroAvg.recall)}</td>
                  <td className="p-3 text-center text-primary">{fmt(cmData.macroAvg.f1)}</td>
                  <td className="p-3 text-center text-primary">{fmt(cmData.macroAvg.accuracy)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
