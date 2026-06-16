'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp, Award, Target, BarChart3, PieChart as PieChartIcon,
  AlertTriangle, CheckCircle2, XCircle, Activity, Wand2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OpenConfusionMatrix } from '@/components/open-confusion-matrix'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'

const CHART_COLORS = {
  primary: '#a855f7', secondary: '#c084fc', success: '#22c55e',
  warning: '#eab308', error: '#ef4444', muted: '#6b7280', accent: '#d8b4fe',
}

const API_ERRORS = ['TIMEOUT', 'API_ERROR', 'EMPTY_RESPONSE']

const tooltipStyle = {
  backgroundColor: '#1f1f23', border: '1px solid #374151',
  borderRadius: '8px', color: '#fff',
}

export function OpenAnalysisTab() {
  const { openResults } = useAppStore()

  const { modelStats, testTypeStats, overallStats, chartData } = useMemo(() => {
    if (openResults.length === 0) return { modelStats: [], testTypeStats: [], overallStats: null, chartData: null }

    const modelMap = new Map<string, any>()
    const testTypeMap = new Map<string, any>()

    openResults.forEach((r) => {
      const modelKey = `${r.providerName}/${r.modelName}`
      if (!modelMap.has(modelKey)) {
        modelMap.set(modelKey, {
          modelKey, modelName: r.modelName, providerName: r.providerName,
          totalTests: 0, correctAnswers: 0, wrongAnswers: 0, errors: 0,
          normalizedCount: 0, accuracy: 0,
        })
      }
      if (!testTypeMap.has(r.testType)) {
        testTypeMap.set(r.testType, {
          testType: r.testType, totalTests: 0, correctAnswers: 0,
          wrongAnswers: 0, errors: 0, accuracy: 0,
        })
      }
      const ms = modelMap.get(modelKey)!
      const ts = testTypeMap.get(r.testType)!
      ms.totalTests++; ts.totalTests++
      if (r.wasNormalized) ms.normalizedCount++
      const isApiErr = API_ERRORS.includes(r.normalizedResponse)
      if (isApiErr) { ms.errors++; ts.errors++ }
      else if (r.isCorrect) { ms.correctAnswers++; ts.correctAnswers++ }
      else { ms.wrongAnswers++; ts.wrongAnswers++ }
    })

    modelMap.forEach(s => {
      const valid = s.totalTests - s.errors
      s.accuracy = valid > 0 ? (s.correctAnswers / valid) * 100 : 0
    })
    testTypeMap.forEach(s => {
      const valid = s.totalTests - s.errors
      s.accuracy = valid > 0 ? (s.correctAnswers / valid) * 100 : 0
    })

    const sortedModel = Array.from(modelMap.values()).sort((a, b) => b.accuracy - a.accuracy)
    const sortedType = Array.from(testTypeMap.values()).sort((a, b) => b.accuracy - a.accuracy)

    const totalTests = openResults.length
    const totalCorrect = sortedModel.reduce((a, s) => a + s.correctAnswers, 0)
    const totalWrong = sortedModel.reduce((a, s) => a + s.wrongAnswers, 0)
    const totalErrors = sortedModel.reduce((a, s) => a + s.errors, 0)
    const totalNormalized = sortedModel.reduce((a, s) => a + s.normalizedCount, 0)
    const overallAccuracy = (totalTests - totalErrors) > 0
      ? (totalCorrect / (totalTests - totalErrors)) * 100 : 0

    const barChartData = sortedModel.map(s => ({
      name: s.modelName.length > 12 ? s.modelName.slice(0, 12) + '...' : s.modelName,
      fullName: s.modelName, provider: s.providerName,
      acertos: s.correctAnswers, erros: s.wrongAnswers, apiErrors: s.errors,
      accuracy: s.accuracy,
    }))

    const pieChartData = [
      { name: 'Correct', value: totalCorrect, color: CHART_COLORS.success },
      { name: 'Wrong', value: totalWrong, color: CHART_COLORS.error },
      { name: 'API Error', value: totalErrors, color: CHART_COLORS.muted },
    ].filter(d => d.value > 0)

    const radarData = sortedType.map(s => ({
      subject: s.testType.length > 15 ? s.testType.slice(0, 15) + '...' : s.testType,
      fullName: s.testType, accuracy: s.accuracy, fullMark: 100,
    }))

    const testTypeBarData = sortedType.map(s => ({
      name: s.testType.length > 12 ? s.testType.slice(0, 12) + '...' : s.testType,
      fullName: s.testType, acertos: s.correctAnswers, erros: s.wrongAnswers,
      apiErrors: s.errors, accuracy: s.accuracy,
    }))

    return {
      modelStats: sortedModel, testTypeStats: sortedType,
      overallStats: {
        totalTests, totalCorrect, totalWrong, totalErrors, totalNormalized,
        overallAccuracy, totalModels: sortedModel.length,
        bestModel: sortedModel[0], worstModel: sortedModel[sortedModel.length - 1],
      },
      chartData: { barChartData, pieChartData, radarData, testTypeBarData },
    }
  }, [openResults])

  if (openResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <Activity className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Run the Open Prompt process to view the analysis.</p>
      </div>
    )
  }
  if (!overallStats || !chartData) return null

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border hover-lift transition-all">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" /><span className="text-xs uppercase">Total Tests</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{overallStats.totalTests}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hover-lift transition-all">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-xs uppercase">Correct</span>
            </div>
            <p className="text-3xl font-bold text-green-500">{overallStats.totalCorrect}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hover-lift transition-all">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <XCircle className="w-4 h-4 text-red-500" /><span className="text-xs uppercase">Wrong</span>
            </div>
            <p className="text-3xl font-bold text-red-500">{overallStats.totalWrong}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hover-lift transition-all">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wand2 className="w-4 h-4 text-amber-400" /><span className="text-xs uppercase">Normalized</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">{overallStats.totalNormalized}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Accuracy + Best/Worst */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/10 border-primary/30 hover-lift">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <TrendingUp className="w-5 h-5" /><span className="text-sm font-medium">Overall Accuracy</span>
            </div>
            <p className="text-4xl font-bold text-primary">{overallStats.overallAccuracy.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {overallStats.totalCorrect} of {overallStats.totalTests - overallStats.totalErrors} valid answers
            </p>
          </CardContent>
        </Card>
        {overallStats.bestModel && (
          <Card className="bg-green-500/10 border-green-500/30 hover-lift">
            <CardContent className="pt-4">
               <div className="flex items-center gap-2 text-green-500 mb-2">
                <Award className="w-5 h-5" /><span className="text-sm font-medium">Best Model</span>
              </div>
              <p className="text-xl font-bold text-foreground truncate" title={overallStats.bestModel.modelName}>{overallStats.bestModel.modelName}</p>
              <p className="text-xs text-muted-foreground truncate" title={overallStats.bestModel.providerName.replace(/_/g, ' ')}>{overallStats.bestModel.providerName.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold text-green-500 mt-1">{overallStats.bestModel.accuracy.toFixed(1)}%</p>
            </CardContent>
          </Card>
        )}
        {overallStats.worstModel && modelStats.length > 1 && (
          <Card className="bg-red-500/10 border-red-500/30 hover-lift">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <AlertTriangle className="w-5 h-5" /><span className="text-sm font-medium">Worst Model</span>
              </div>
              <p className="text-xl font-bold text-foreground truncate" title={overallStats.worstModel.modelName}>{overallStats.worstModel.modelName}</p>
              <p className="text-xs text-muted-foreground truncate" title={overallStats.worstModel.providerName.replace(/_/g, ' ')}>{overallStats.worstModel.providerName.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{overallStats.worstModel.accuracy.toFixed(1)}%</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 1: Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />Performance by Model
            </CardTitle>
            <CardDescription>Comparison of correct answers, wrong answers and API errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v: any, n: any) => [v, n === 'acertos' ? 'Correct' : n === 'erros' ? 'Wrong' : 'API Error']}
                    labelFormatter={(l: any, p: any) => p?.[0]?.payload?.fullName || l} />
                  <Legend formatter={(v) => v === 'acertos' ? 'Correct' : v === 'erros' ? 'Wrong' : 'API Error'} />
                  <Bar dataKey="acertos" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="erros" fill={CHART_COLORS.error} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="apiErrors" fill={CHART_COLORS.muted} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" />Overall Distribution
            </CardTitle>
            <CardDescription>Proportion of results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.pieChartData}
                    cx="50%" cy="45%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                      const R = Math.PI / 180
                      const r = innerRadius + (outerRadius - innerRadius) * 1.5
                      const x = (cx as number) + r * Math.cos(-midAngle * R)
                      const y = (cy as number) + r * Math.sin(-midAngle * R)
                      return (
                        <text x={x} y={y} fill="#9ca3af" textAnchor={x > (cx as number) ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      )
                    }}
                    labelLine={false}
                  >
                    {chartData.pieChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Test Type Performance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />Performance by Test Type
          </CardTitle>
          <CardDescription>Correct answers and errors for each test category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.testTypeBarData} layout="vertical" margin={{ top: 20, right: 30, left: 120, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v: any, n: any) => [v, n === 'acertos' ? 'Correct' : n === 'erros' ? 'Wrong' : 'API Error']}
                  labelFormatter={(l: any, p: any) => p?.[0]?.payload?.fullName || l} />
                <Legend formatter={(v) => v === 'acertos' ? 'Correct' : v === 'erros' ? 'Wrong' : 'API Error'} />
                <Bar dataKey="acertos" fill={CHART_COLORS.success} radius={[0, 4, 4, 0]} />
                <Bar dataKey="erros" fill={CHART_COLORS.error} radius={[0, 4, 4, 0]} />
                <Bar dataKey="apiErrors" fill={CHART_COLORS.muted} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />Accuracy by Test Type (Radar)
          </CardTitle>
          <CardDescription>Radial visualization of performance in each category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData.radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Radar name="Accuracy" dataKey="accuracy" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.5} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Accuracy']}
                  labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Confusion Matrix & Per-Class Metrics */}
      <OpenConfusionMatrix results={openResults} />

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />Models Ranking
            </CardTitle>
            <CardDescription>Ordered by accuracy rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {modelStats.map((s, i) => (
                <div key={s.modelKey} className="space-y-2 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        i === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={s.modelName}>{s.modelName}</p>
                        <p className="text-xs text-muted-foreground truncate" title={s.providerName.replace(/_/g, ' ')}>{s.providerName.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-lg font-bold',
                        s.accuracy >= 70 ? 'text-green-500' : s.accuracy >= 50 ? 'text-yellow-500' : 'text-red-500')}>
                        {s.accuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{s.correctAnswers}/{s.totalTests - s.errors}</p>
                    </div>
                  </div>
                  <Progress value={s.accuracy} className={cn('h-2',
                    s.accuracy >= 70 ? '[&>div]:bg-green-500' : s.accuracy >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500')} />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-500">{s.correctAnswers} correct</span>
                    <span className="text-red-500">{s.wrongAnswers} wrong</span>
                    {s.errors > 0 && <span className="text-yellow-500">{s.errors} API errors</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />Test Type Ranking
            </CardTitle>
            <CardDescription>Ordered by accuracy rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {testTypeStats.map((s, i) => (
                <div key={s.testType} className="space-y-2 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        i === 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}>
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-foreground">{s.testType}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-lg font-bold',
                        s.accuracy >= 70 ? 'text-green-500' : s.accuracy >= 50 ? 'text-yellow-500' : 'text-red-500')}>
                        {s.accuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{s.correctAnswers}/{s.totalTests - s.errors}</p>
                    </div>
                  </div>
                  <Progress value={s.accuracy} className={cn('h-2',
                    s.accuracy >= 70 ? '[&>div]:bg-green-500' : s.accuracy >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500')} />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-500">{s.correctAnswers} correct</span>
                    <span className="text-red-500">{s.wrongAnswers} wrong</span>
                    {s.errors > 0 && <span className="text-yellow-500">{s.errors} API errors</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistical Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />Statistical Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Average Accuracy (Models)</p>
              <p className="text-2xl font-bold text-foreground">
                {modelStats.length > 0
                  ? (modelStats.reduce((a, s) => a + s.accuracy, 0) / modelStats.length).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Average Accuracy (Tests)</p>
              <p className="text-2xl font-bold text-foreground">
                {testTypeStats.length > 0
                  ? (testTypeStats.reduce((a, s) => a + s.accuracy, 0) / testTypeStats.length).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Standard Deviation (Models)</p>
              <p className="text-2xl font-bold text-foreground">
                {(() => {
                  if (modelStats.length === 0) return '0.0'
                  const mean = modelStats.reduce((a, s) => a + s.accuracy, 0) / modelStats.length
                  const variance = modelStats.reduce((a, s) => a + Math.pow(s.accuracy - mean, 2), 0) / modelStats.length
                  return Math.sqrt(variance).toFixed(1)
                })()}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Normalization Rate</p>
              <p className="text-2xl font-bold text-amber-400">
                {overallStats.totalTests > 0
                  ? ((overallStats.totalNormalized / overallStats.totalTests) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
