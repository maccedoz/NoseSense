'use client'

import { create } from 'zustand'
import type { Provider, LLMModel, ProcessResult, ProcessError, ProcessStatus } from './types'

const PREDEFINED_MODELS: Record<string, string[]> = {
  'OpenAI': ['GPT-4o', 'GPT-4o-mini', 'GPT-4-turbo', 'GPT-3.5-turbo'],
  'TogetherAI': ['DeepSeek-R1', 'Gemma-3n', 'Qwen2.5-7B'],
  'GoogleAI': ['Gemini 2.5 Flash'],
}

/**
 * Formata a parte de modelo de uma chave retornada pelo backend.
 * Ex: "gpt5" -> "GPT-5"; "gpt4.1-nano" -> "GPT-4.1-nano".
 */
function formatBackendModelName(raw: string) {
  // deixa em maiúsculas a parte "gpt" e mantém resto
  return raw
    .replace(/^gpt/i, (m) => m.toUpperCase())
}

// este helper agora é criado dentro do escopo do store para poder acessar get()

interface AppState {
  providers: Provider[]
  results: ProcessResult[]
  errors: ProcessError[]
  status: ProcessStatus
  progress: number
  // --- NOVOS ESTADOS ---
  activeBackendModels: string[] // Lista de strings vindas do Python
  
  fetchActiveModels: () => Promise<void>
  fetchPreviousResults: () => Promise<void>
  addProvider: (provider: { name: string; apiKey: string }) => void
  removeProvider: (id: string) => void
  toggleProviderExpanded: (id: string) => void
  toggleModel: (providerId: string, modelId: string) => void
  setStatus: (status: ProcessStatus) => void
  setProgress: (progress: number) => void
  addResult: (result: ProcessResult) => void
  addError: (error: ProcessError) => void
  resetResults: () => void
  getModelsForProvider: (providerName: string) => LLMModel[]
  getEnabledModels: () => { provider: Provider; model: LLMModel }[]
} 

export const useAppStore = create<AppState>((set, get) => ({
  providers: [],
  results: [],
  errors: [],
  status: 'idle',
  progress: 0,
  activeBackendModels: [], // Inicialmente vazio
  
  // retorna um array de LLMModel baseado nos nomes enviados pelo backend
  getModelsForProvider: (providerName: string): LLMModel[] => {
    const backend = get().activeBackendModels
    
    // Tratamento especial para o prefixo da GoogleAI
    // Se for 'GoogleAI', o python manda como 'google_gemini'
    const keyPrefix = providerName === 'GoogleAI' 
      ? 'google_' 
      : providerName.toLowerCase() + '_'
      
    const fromBackend = backend
      .filter((k) => k.startsWith(keyPrefix))
      .map((k, idx) => {
        const rawModel = k.slice(keyPrefix.length)
        return {
          id: `m-${providerName.toLowerCase()}-${idx}`,
          name: formatBackendModelName(rawModel),
          enabled: false,
          backendId: k,
        } as LLMModel
      })
    if (fromBackend.length > 0) return fromBackend
    // fallback estático
    const modelNames = PREDEFINED_MODELS[providerName] || []
    return modelNames.map((name, index) => ({
      id: `m-${providerName.toLowerCase()}-${index}`,
      name,
      enabled: false,
    }))
  },

  // FUNÇÃO PARA PUXAR DO BACKEND
  fetchActiveModels: async () => {
    try {
      const response = await fetch('http://localhost:8001/api/active-models')
      if (response.ok) {
        const models = await response.json()
        set((state) => {
          // atualiza providers existentes com novos modelos
          const providers = state.providers.map((p) => {
            const existingEnabled = new Set(p.models.filter(m => m.enabled).map(m => m.name))
            const newModels: LLMModel[] = get().getModelsForProvider(p.name)
            // reaplica flag enabled quando o nome for mantido
            newModels.forEach((m: LLMModel) => {
              if (existingEnabled.has(m.name)) m.enabled = true
            })
            return { ...p, models: newModels }
          })
          return { activeBackendModels: models, providers }
        })
      }
    } catch (error) {
      console.error("Erro ao sincronizar modelos com o backend:", error)
    }
  },

  fetchPreviousResults: async () => {
    try {
      const response = await fetch('http://localhost:8001/api/results')
      if (response.ok) {
        const history: ProcessResult[] = await response.json()
        if (history.length > 0) {
          
          // Mapear os modelos retornados ("openai_gpt5") para o nome e provedor original da UI ("GPT-5")
          const mappedHistory = history.map(item => {
            let providerName = 'Desconhecido'
            let modelName = item.modelName
            const raw = item.modelName

            if (raw.startsWith('google_')) {
              providerName = 'GoogleAI'
              modelName = formatBackendModelName(raw.slice(7))
            } else if (raw.startsWith('openai_')) {
              providerName = 'OpenAI'
              modelName = formatBackendModelName(raw.slice(7))
            } else if (raw.startsWith('togetherai_')) {
              providerName = 'TogetherAI'
              modelName = formatBackendModelName(raw.slice(11))
            } else {
              // Fallback para modelos customizados
              for (const p of get().providers) {
                const matchedModel = p.models.find(m => m.backendId === raw || m.id === raw)
                if (matchedModel) {
                  providerName = p.name
                  modelName = matchedModel.name
                  break
                }
              }
            }

            return {
              ...item,
              providerName,
              modelName
            }
          })
          
          set({
             results: mappedHistory,
             status: 'completed', // Força a tela de Dashboard exibir as análises
             progress: 100
          })
        }
      }
    } catch (error) {
      console.error("Erro ao buscar histórico do banco:", error)
    }
  },

  addProvider: ({ name, apiKey }) => {
    const models: LLMModel[] = get().getModelsForProvider(name)
    set((state) => ({
      providers: [...state.providers, { 
        id: crypto.randomUUID(), 
        name, 
        apiKey, 
        models,
        expanded: false,
      }],
    }))
    // Após adicionar, tentamos sincronizar com o back
    get().fetchActiveModels()
  },
  
  removeProvider: (id) => set((state) => ({
    providers: state.providers.filter((p) => p.id !== id),
  })),
  
  toggleProviderExpanded: (id) => set((state) => ({
    providers: state.providers.map((p) =>
      p.id === id ? { ...p, expanded: !p.expanded } : p
    ),
  })),
  
  toggleModel: (providerId, modelId) => set((state) => ({
    providers: state.providers.map((p) =>
      p.id === providerId
        ? {
            ...p,
            models: p.models.map((m) =>
              m.id === modelId ? { ...m, enabled: !m.enabled } : m
            ),
          }
        : p
    ),
  })),
  
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  addResult: (result) => set((state) => ({ results: [...state.results, result] })),
  addError: (error) => set((state) => ({ errors: [...state.errors, error] })),
  resetResults: () => set({ results: [], errors: [], progress: 0, status: 'idle' }),
  
  getEnabledModels: () => {
    const state = get()
    const enabledModels: { provider: Provider; model: LLMModel }[] = []
    state.providers.forEach((provider) => {
      provider.models.forEach((model) => {
        if (model.enabled) enabledModels.push({ provider, model })
      })
    })
    return enabledModels
  },
}))