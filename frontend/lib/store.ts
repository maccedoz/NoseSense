'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Provider, LLMModel, ProcessResult, ProcessError, ProcessStatus } from './types'

const PREDEFINED_MODELS: Record<string, string[]> = {
  'OpenAI': ['GPT-4o', 'GPT-4o-mini', 'GPT-4-turbo', 'GPT-3.5-turbo'],
  'TogetherAI': ['DeepSeek-R1', 'Gemma-3n', 'Qwen2.5-7B'],
  'GoogleAI': ['Gemini 2.5 Flash'],
  'AnthropicAI': ['Claude 4.6 Opus', 'Claude 4.5 Sonnet', 'Claude 4.5 Haiku'],
}

function formatBackendModelName(raw: string) {
  return raw.replace(/^gpt/i, (m) => m.toUpperCase())
}

function getKeyPrefix(providerName: string): string {
  if (providerName === 'GoogleAI') return 'google_'
  if (providerName === 'AnthropicAI') return 'anthropic_'
  if (providerName === 'TogetherAI') return 'togetherai_'
  if (providerName === 'OpenAI') return 'openai_'
  return providerName.toLowerCase() + '_'
}

/**
 * Builds an LLMModel[] for a given provider from the backend model keys.
 * Uses selectedBackendIds (a flat set of backendIds) to set enabled state —
 * decoupled from the model list structure so it survives any rebuild.
 */
function buildModelsForProvider(
  providerName: string,
  backendModels: string[],
  selectedBackendIds: Set<string>
): LLMModel[] {
  const keyPrefix = getKeyPrefix(providerName)

  const fromBackend = backendModels
    .filter((k) => k.startsWith(keyPrefix))
    .map((k, idx) => ({
      id: `m-${keyPrefix}${idx}`,
      name: formatBackendModelName(k.slice(keyPrefix.length)),
      enabled: selectedBackendIds.has(k),
      backendId: k,
    } as LLMModel))

  if (fromBackend.length > 0) return fromBackend

  // static fallback (no real backendId, won't be submitted to backend)
  const modelNames = PREDEFINED_MODELS[providerName] || []
  return modelNames.map((name, index) => ({
    id: `m-${keyPrefix}${index}`,
    name,
    enabled: false,
    backendId: undefined,
  }))
}

interface AppState {
  providers: Provider[]
  results: ProcessResult[]
  errors: ProcessError[]
  status: ProcessStatus
  progress: number
  activeBackendModels: string[]
  /** Flat list of backendIds that the user has toggled ON — persisted independently */
  selectedBackendIds: string[]

  fetchActiveModels: () => Promise<string[]>
  fetchPreviousResults: () => Promise<void>
  fetchSavedProviders: () => Promise<void>
  addProvider: (provider: { name: string; apiKey: string }) => Promise<void>
  removeProvider: (id: string) => void
  removeProviderKey: (providerName: string) => Promise<void>
  toggleProviderExpanded: (id: string) => void
  toggleModel: (providerId: string, modelId: string) => void
  toggleAllModels: (providerId: string, enabled: boolean) => void
  setStatus: (status: ProcessStatus) => void
  setProgress: (progress: number) => void
  addResult: (result: ProcessResult) => void
  addError: (error: ProcessError) => void
  resetResults: () => void
  getModelsForProvider: (providerName: string) => LLMModel[]
  getEnabledModels: () => { provider: Provider; model: LLMModel }[]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      providers: [],
      results: [],
      errors: [],
      status: 'idle',
      progress: 0,
      activeBackendModels: [],
      selectedBackendIds: [],

      getModelsForProvider: (providerName: string): LLMModel[] => {
        return buildModelsForProvider(
          providerName,
          get().activeBackendModels,
          new Set(get().selectedBackendIds)
        )
      },

      fetchActiveModels: async () => {
        try {
          const response = await fetch('http://localhost:8001/api/active-models')
          if (response.ok) {
            const models: string[] = await response.json()
            const selected = new Set(get().selectedBackendIds)
            set((state) => ({
              activeBackendModels: models,
              providers: state.providers.map((p) => ({
                ...p,
                models: buildModelsForProvider(p.name, models, selected),
              })),
            }))
            return models
          }
        } catch (error) {
          console.error('Erro ao sincronizar modelos com o backend:', error)
        }
        return []
      },

      fetchPreviousResults: async () => {
        try {
          const response = await fetch('http://localhost:8001/api/results')
          if (response.ok) {
            const history: ProcessResult[] = await response.json()
            if (history.length > 0) {
              const mappedHistory = history.map(item => {
                let providerName = 'Unknown'
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
                } else if (raw.startsWith('anthropic_')) {
                  providerName = 'AnthropicAI'
                  modelName = formatBackendModelName(raw.slice(10))
                }

                return { ...item, providerName, modelName }
              })

              set({ results: mappedHistory, status: 'completed', progress: 100 })
            }
          }
        } catch (error) {
          console.error('Erro ao buscar histórico do banco:', error)
        }
      },

      addProvider: async ({ name, apiKey }) => {
        let backendModels = get().activeBackendModels
        if (backendModels.length === 0) {
          backendModels = await get().fetchActiveModels()
        }
        const selected = new Set(get().selectedBackendIds)
        const models = buildModelsForProvider(name, backendModels, selected)
        set((state) => ({
          providers: [...state.providers, {
            id: crypto.randomUUID(),
            name,
            apiKey,
            models,
            expanded: false,
          }],
        }))
      },

      fetchSavedProviders: async () => {
        try {
          const [savedRes, modelsRes] = await Promise.all([
            fetch('http://localhost:8001/api/saved-providers'),
            fetch('http://localhost:8001/api/active-models'),
          ])
          if (!savedRes.ok || !modelsRes.ok) return

          const savedNames: string[] = await savedRes.json()
          const backendModels: string[] = await modelsRes.json()
          const selected = new Set(get().selectedBackendIds)

          set((state) => {
            const existingNames = new Set(state.providers.map(p => p.name))
            const newProviders: Provider[] = []

            for (const name of savedNames) {
              if (!existingNames.has(name)) {
                newProviders.push({
                  id: crypto.randomUUID(),
                  name,
                  apiKey: '***',
                  models: buildModelsForProvider(name, backendModels, selected),
                  expanded: false,
                })
              }
            }

            // Always rebuild existing providers' model lists from fresh backend data
            const updatedExisting = state.providers.map(p => ({
              ...p,
              models: buildModelsForProvider(p.name, backendModels, selected),
            }))

            return {
              activeBackendModels: backendModels,
              providers: [...updatedExisting, ...newProviders],
            }
          })
        } catch (error) {
          console.error('Erro ao buscar providers salvos:', error)
        }
      },

      removeProviderKey: async (providerName: string) => {
        try {
          await fetch(`http://localhost:8001/api/saved-providers/${providerName}`, { method: 'DELETE' })
        } catch (e) {
          console.error('Erro ao remover chave do backend:', e)
        }
        // Remove all backendIds from this provider from selectedBackendIds too
        const prefix = getKeyPrefix(providerName)
        set((state) => ({
          providers: state.providers.filter((p) => p.name !== providerName),
          selectedBackendIds: state.selectedBackendIds.filter(id => !id.startsWith(prefix)),
        }))
      },

      removeProvider: (id) => set((state) => ({
        providers: state.providers.filter((p) => p.id !== id),
      })),

      toggleProviderExpanded: (id) => set((state) => ({
        providers: state.providers.map((p) =>
          p.id === id ? { ...p, expanded: !p.expanded } : p
        ),
      })),

      toggleModel: (providerId, modelId) => set((state) => {
        const provider = state.providers.find(p => p.id === providerId)
        const model = provider?.models.find(m => m.id === modelId)
        if (!model) return state

        const nowEnabled = !model.enabled
        let newSelectedIds = [...state.selectedBackendIds]
        if (model.backendId) {
          if (nowEnabled) {
            if (!newSelectedIds.includes(model.backendId)) newSelectedIds.push(model.backendId)
          } else {
            newSelectedIds = newSelectedIds.filter(id => id !== model.backendId)
          }
        }

        return {
          selectedBackendIds: newSelectedIds,
          providers: state.providers.map((p) =>
            p.id === providerId
              ? { ...p, models: p.models.map((m) => m.id === modelId ? { ...m, enabled: nowEnabled } : m) }
              : p
          ),
        }
      }),

      toggleAllModels: (providerId, enabled) => set((state) => {
        const provider = state.providers.find(p => p.id === providerId)
        if (!provider) return state

        const providerBackendIds = provider.models
          .map(m => m.backendId)
          .filter((id): id is string => Boolean(id))

        let newSelectedIds = [...state.selectedBackendIds]
        if (enabled) {
          providerBackendIds.forEach(id => {
            if (!newSelectedIds.includes(id)) newSelectedIds.push(id)
          })
        } else {
          const toRemove = new Set(providerBackendIds)
          newSelectedIds = newSelectedIds.filter(id => !toRemove.has(id))
        }

        return {
          selectedBackendIds: newSelectedIds,
          providers: state.providers.map((p) =>
            p.id === providerId
              ? { ...p, models: p.models.map((m) => ({ ...m, enabled })) }
              : p
          ),
        }
      }),

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
    }),
    {
      name: 'nosesense-storage-v2', // bump version to clear old stale cache
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedBackendIds: state.selectedBackendIds, // track selections independently
        activeBackendModels: state.activeBackendModels,
      }),
    }
  )
)