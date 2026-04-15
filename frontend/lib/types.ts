export interface LLMModel {
  id: string
  name: string
  enabled: boolean
  backendId?: string
}

export type ApiType = 'openai' | 'google' | 'anthropic'

export interface Provider {
  id: string
  name: string
  apiKey: string
  apiType: ApiType
  baseUrl?: string
  models: LLMModel[]
  expanded: boolean
}

export const TEST_TYPES = [
  "Duplicate Assert",
  "Assertion Roulette", 
  "Magic Number Test",
  "Eager Test",
  "Ignored Test",
  "Unknown Test",
  "Verbose Test",
  "Conditional Test Logic",
  "Exception Catching Throwing",
  "Sensitive Equality",
] as const

export type TestType = typeof TEST_TYPES[number]

export const ANSWER_OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const
export type AnswerOption = typeof ANSWER_OPTIONS[number]

// Resposta correta para cada tipo de teste (simulado)
export const CORRECT_ANSWERS: Record<TestType, AnswerOption> = {
  "Duplicate Assert": 'B',
  "Assertion Roulette": 'A',
  "Magic Number Test": 'C',
  "Eager Test": 'D',
  "Ignored Test": 'A',
  "Unknown Test": 'E',
  "Verbose Test": 'B',
  "Conditional Test Logic": 'C',
  "Exception Catching Throwing": 'A',
  "Sensitive Equality": 'D',
}

export interface ProcessResult {
  id: string
  modelName: string
  providerName: string
  testType: TestType
  testIndex?: number
  correctAnswer?: AnswerOption | string
  status: 'success' | 'error'
  answer?: AnswerOption | string
  errorMessage?: string
  timestamp: Date
}

export interface ProcessError {
  modelName: string
  providerName: string
  testType: TestType
  message: string
  timestamp: Date
}

export type ProcessStatus = 'idle' | 'running' | 'completed' | 'error'
