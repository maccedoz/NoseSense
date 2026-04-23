'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { TEST_TYPES, CORRECT_ANSWERS, type TestType } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Award, 
  Target, 
  BarChart3, 
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

interface ModelStats {
  modelKey: string
  modelName: string
  providerName: string
  totalTests: number
  correctAnswers: number
  wrongAnswers: number
  errors: number
  accuracy: number
}

interface TestTypeStats {
  testType: TestType
  totalTests: number
  correctAnswers: number
  wrongAnswers: number
  errors: number
  accuracy: number
}

// Cores para graficos (nao usar CSS vars diretamente no Recharts)
const CHART_COLORS = {
  primary: '#a855f7',
  secondary: '#c084fc',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  muted: '#6b7280',
  accent: '#d8b4fe',
}

const PIE_COLORS = ['#a855f7', '#c084fc', '#d8b4fe', '#22c55e', '#eab308', '#ef4444', '#6b7280', '#f472b6', '#60a5fa', '#34d399']

export function AnalysisTab() {
  const { results, status } = useAppStore()

  const { modelStats, testTypeStats, overallStats, chartData } = useMemo(() => {
    if (results.length === 0) {
      return { modelStats: [], testTypeStats: [], overallStats: null, chartData: null }
    }

    // Stats por modelo
    const modelMap = new Map<string, ModelStats>()
    // Stats por tipo de teste
    const testTypeMap = new Map<TestType, TestTypeStats>()
    
    // Inicializar tipos de teste
    TEST_TYPES.forEach((tt) => {
      testTypeMap.set(tt, {
        testType: tt,
        totalTests: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        errors: 0,
        accuracy: 0,
      })
    })

    // Processar resultados
    results.forEach((result) => {
      const modelKey = `${result.providerName}/${result.modelName}`
      
      if (!modelMap.has(modelKey)) {
        modelMap.set(modelKey, {
          modelKey,
          modelName: result.modelName,
          providerName: result.providerName,
          totalTests: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          errors: 0,
          accuracy: 0,
        })
      }
      
      const modelStat = modelMap.get(modelKey)!

      // Dynamically add unknown test types (file names may differ from TEST_TYPES constants)
      const testTypeKey = result.testType as TestType
      if (!testTypeMap.has(testTypeKey)) {
        testTypeMap.set(testTypeKey, {
          testType: testTypeKey,
          totalTests: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          errors: 0,
          accuracy: 0,
        })
      }
      const testTypeStat = testTypeMap.get(testTypeKey)!
      
      modelStat.totalTests++
      testTypeStat.totalTests++
      
      if (result.status === 'error') {
        modelStat.errors++
        testTypeStat.errors++
      } else if (result.status === 'success' && result.answer) {
        const correctAnswer = result.correctAnswer || CORRECT_ANSWERS[result.testType]
        
        if (result.answer === correctAnswer) {
          modelStat.correctAnswers++
          testTypeStat.correctAnswers++
        } else {
          modelStat.wrongAnswers++
          testTypeStat.wrongAnswers++
        }
      }
    })

    // Calcular accuracy
    modelMap.forEach((stats) => {
      const validTests = stats.totalTests - stats.errors
      stats.accuracy = validTests > 0 ? (stats.correctAnswers / validTests) * 100 : 0
    })
    
    testTypeMap.forEach((stats) => {
      const validTests = stats.totalTests - stats.errors
      stats.accuracy = validTests > 0 ? (stats.correctAnswers / validTests) * 100 : 0
    })

    const sortedModelStats = Array.from(modelMap.values()).sort((a, b) => b.accuracy - a.accuracy)
    const sortedTestTypeStats = Array.from(testTypeMap.values()).sort((a, b) => b.accuracy - a.accuracy)

    // Overall stats
    const totalTests = results.length
    const totalCorrect = sortedModelStats.reduce((acc, s) => acc + s.correctAnswers, 0)
    const totalWrong = sortedModelStats.reduce((acc, s) => acc + s.wrongAnswers, 0)
    const totalErrors = sortedModelStats.reduce((acc, s) => acc + s.errors, 0)
    const overallAccuracy = (totalTests - totalErrors) > 0 
      ? (totalCorrect / (totalTests - totalErrors)) * 100 
      : 0

    // Dados para graficos
    const barChartData = sortedModelStats.map((s) => ({
      name: s.modelName.length > 12 ? s.modelName.slice(0, 12) + '...' : s.modelName,
      fullName: s.modelName,
      provider: s.providerName,
      acertos: s.correctAnswers,
      erros: s.wrongAnswers,
      apiErrors: s.errors,
      accuracy: s.accuracy,
    }))

    const pieChartData = [
      { name: 'Correct', value: totalCorrect, color: CHART_COLORS.success },
      { name: 'Errors', value: totalWrong, color: CHART_COLORS.error },
      { name: 'API Error', value: totalErrors, color: CHART_COLORS.muted },
    ].filter(d => d.value > 0)

    const radarData = sortedTestTypeStats.map((s) => ({
      subject: s.testType.length > 15 ? s.testType.slice(0, 15) + '...' : s.testType,
      fullName: s.testType,
      accuracy: s.accuracy,
      fullMark: 100,
    }))

    const testTypeBarData = sortedTestTypeStats.map((s) => ({
      name: s.testType.length > 12 ? s.testType.slice(0, 12) + '...' : s.testType,
      fullName: s.testType,
      acertos: s.correctAnswers,
      erros: s.wrongAnswers,
      apiErrors: s.errors,
      accuracy: s.accuracy,
    }))

    return {
      modelStats: sortedModelStats,
      testTypeStats: sortedTestTypeStats,
      overallStats: {
        totalTests,
        totalCorrect,
        totalWrong,
        totalErrors,
        overallAccuracy,
        totalModels: sortedModelStats.length,
        bestModel: sortedModelStats[0],
        worstModel: sortedModelStats[sortedModelStats.length - 1],
        bestTestType: sortedTestTypeStats[0],
        worstTestType: sortedTestTypeStats[sortedTestTypeStats.length - 1],
      },
      chartData: {
        barChartData,
        pieChartData,
        radarData,
        testTypeBarData,
      },
    }
  }, [results])

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <Activity className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Run the process to view the analysis.</p>
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
              <Target className="w-4 h-4" />
              <span className="text-xs uppercase">Total Tests</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{overallStats.totalTests}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border hover-lift transition-all">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs uppercase">Correct</span>
            </div>
            <p className="text-3xl font-bold text-green-500">{overallStats.totalCorrect}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border hover-lift transition-all">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs uppercase">Errors</span>
            </div>
            <p className="text-3xl font-bold text-red-500">{overallStats.totalWrong}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border hover-lift transition-all">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-xs uppercase">API Errors</span>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{overallStats.totalErrors}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Accuracy + Best/Worst */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/10 border-primary/30 hover-lift">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Overall Accuracy</span>
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
                <Award className="w-5 h-5" />
                <span className="text-sm font-medium">Best Model</span>
              </div>
              <p className="text-xl font-bold text-foreground">{overallStats.bestModel.modelName}</p>
              <p className="text-xs text-muted-foreground">{overallStats.bestModel.providerName}</p>
              <p className="text-2xl font-bold text-green-500 mt-1">{overallStats.bestModel.accuracy.toFixed(1)}%</p>
            </CardContent>
          </Card>
        )}

        {overallStats.worstModel && modelStats.length > 1 && (
          <Card className="bg-red-500/10 border-red-500/30 hover-lift">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Worst Model</span>
              </div>
              <p className="text-xl font-bold text-foreground">{overallStats.worstModel.modelName}</p>
              <p className="text-xs text-muted-foreground">{overallStats.worstModel.providerName}</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{overallStats.worstModel.accuracy.toFixed(1)}%</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 1: Bar Chart LLMs + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Performance by Model
            </CardTitle>
            <CardDescription>Comparison of correct answers, errors, and API errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f1f23', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: any, name: any) => [value, name === 'acertos' ? 'Correct' : name === 'erros' ? 'Wrong' : 'API Error']}
                    labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => value === 'acertos' ? 'Correct' : value === 'erros' ? 'Wrong' : 'API Error'}
                  />
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
              <PieChartIcon className="w-4 h-4 text-primary" />
              Overall Distribution
            </CardTitle>
            <CardDescription>Proportion of results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f1f23', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
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
            <BarChart3 className="w-4 h-4 text-primary" />
            Performance by Test Type
          </CardTitle>
          <CardDescription>Correct answers and errors for each test category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData.testTypeBarData} 
                layout="vertical"
                margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f1f23', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any, name: any) => [value, name === 'acertos' ? 'Correct' : name === 'erros' ? 'Wrong' : 'API Error']}
                  labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                />
                <Legend 
                  formatter={(value) => value === 'acertos' ? 'Correct' : value === 'erros' ? 'Wrong' : 'API Error'}
                />
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
            <Activity className="w-4 h-4 text-primary" />
            Accuracy by Test Type (Radar)
          </CardTitle>
          <CardDescription>Radial visualization of performance in each category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData.radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <Radar
                  name="Accuracy"
                  dataKey="accuracy"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f1f23', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxa de Acertos por LLM */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Models Ranking
            </CardTitle>
            <CardDescription>Ordered by accuracy rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {modelStats.map((stats, index) => (
                <div key={stats.modelKey} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{stats.modelName}</p>
                        <p className="text-xs text-muted-foreground">{stats.providerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        stats.accuracy >= 70 ? "text-green-500" : 
                        stats.accuracy >= 50 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {stats.accuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stats.correctAnswers}/{stats.totalTests - stats.errors}
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={stats.accuracy} 
                    className={cn(
                      "h-2",
                      stats.accuracy >= 70 ? "[&>div]:bg-green-500" : 
                      stats.accuracy >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                    )}
                  />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-500">{stats.correctAnswers} correct</span>
                    <span className="text-red-500">{stats.wrongAnswers} errors</span>
                    {stats.errors > 0 && <span className="text-yellow-500">{stats.errors} errors</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Acertos por Tipo de Teste */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Test Type Ranking
            </CardTitle>
            <CardDescription>Ordered by accuracy rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {testTypeStats.map((stats, index) => (
                <div key={stats.testType} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium text-foreground">{stats.testType}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        stats.accuracy >= 70 ? "text-green-500" : 
                        stats.accuracy >= 50 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {stats.accuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stats.correctAnswers}/{stats.totalTests - stats.errors}
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={stats.accuracy} 
                    className={cn(
                      "h-2",
                      stats.accuracy >= 70 ? "[&>div]:bg-green-500" : 
                      stats.accuracy >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                    )}
                  />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-500">{stats.correctAnswers} correct</span>
                    <span className="text-red-500">{stats.wrongAnswers} errors</span>
                    {stats.errors > 0 && <span className="text-yellow-500">{stats.errors} errors</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Statistical Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Average Accuracy (Models)</p>
              <p className="text-2xl font-bold text-foreground">
                {(modelStats.reduce((acc, s) => acc + s.accuracy, 0) / modelStats.length).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Average Accuracy (Tests)</p>
              <p className="text-2xl font-bold text-foreground">
                {(testTypeStats.reduce((acc, s) => acc + s.accuracy, 0) / testTypeStats.length).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Standard Deviation (Models)</p>
              <p className="text-2xl font-bold text-foreground">
                {(() => {
                  const mean = modelStats.reduce((acc, s) => acc + s.accuracy, 0) / modelStats.length
                  const variance = modelStats.reduce((acc, s) => acc + Math.pow(s.accuracy - mean, 2), 0) / modelStats.length
                  return Math.sqrt(variance).toFixed(1)
                })()}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Error Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {((overallStats.totalErrors / overallStats.totalTests) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
