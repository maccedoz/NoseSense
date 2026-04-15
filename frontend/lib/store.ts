'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Provider, LLMModel, ApiType, ProcessResult, ProcessError, ProcessStatus } from './types'

/**
 * Generates a backend model ID from provider name and model name.
 * Must match the backend's convention in llm_initializer.py.
 */
function toBackendId(providerName: string, modelName: string): string {
  return `${providerName.toLowerCase()}_${modelName.replace(/ /g, '_').replace(/\./g, '_').toLowerCase()}`
}

interface AppState {
  providers: Provider[]
  results: ProcessResult[]
  errors: ProcessError[]
  status: ProcessStatus
  progress: number
  /** Flat list of backendIds that the user has toggled ON — persisted independently */
  selectedBackendIds: string[]

  fetchPreviousResults: () => Promise<void>
  fetchSavedProviders: () => Promise<void>
  addProvider: (provider: { name: string; apiKey: string; apiType: ApiType; baseUrl?: string }) => Promise<void>
  removeProviderKey: (providerName: string) => Promise<void>
  updateProviderKey: (providerName: string, newApiKey: string) => Promise<void>
  addModelToProvider: (providerName: string, modelName: string) => Promise<void>
  removeModelFromProvider: (providerName: string, modelName: string) => Promise<void>
  toggleProviderExpanded: (id: string) => void
  toggleModel: (providerId: string, modelId: string) => void
  toggleAllModels: (providerId: string, enabled: boolean) => void
  setStatus: (status: ProcessStatus) => void
  setProgress: (progress: number) => void
  addResult: (result: ProcessResult) => void
  addError: (error: ProcessError) => void
  resetResults: () => void
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
      selectedBackendIds: [],

      fetchPreviousResults: async () => {
        try {
          const response = await fetch('http://localhost:8001/api/results')
          if (response.ok) {
            const history: ProcessResult[] = await response.json()
            if (history.length > 0) {
              const providers = get().providers
              const mappedHistory = history.map(item => {
                let providerName = 'Unknown'
                let modelName = item.modelName
                const raw = item.modelName

                // Try to match backend ID prefix to a known provider
                for (const p of providers) {
                  const prefix = p.name.toLowerCase() + '_'
                  if (raw.startsWith(prefix)) {
                    providerName = p.name
                    modelName = raw.slice(prefix.length)
                    break
                  }
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

      addProvider: async ({ name, apiKey, apiType, baseUrl }) => {
        // Save to backend
        await fetch('http://localhost:8001/api/create-provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            api_key: apiKey,
            api_type: apiType,
            base_url: baseUrl || null,
          }),
        })

        set((state) => ({
          providers: [...state.providers, {
            id: crypto.randomUUID(),
            name,
            apiKey,
            apiType,
            baseUrl,
            models: [],
            expanded: false,
          }],
        }))
      },

      fetchSavedProviders: async () => {
        try {
          const res = await fetch('http://localhost:8001/api/saved-providers')
          if (!res.ok) return

          const savedProviders: { name: string; api_type: string; base_url?: string; models: string[] }[] = await res.json()
          const selected = new Set(get().selectedBackendIds)

          set((state) => {
            const existingNames = new Set(state.providers.map(p => p.name.toLowerCase()))
            const newProviders: Provider[] = []

            for (const sp of savedProviders) {
              if (!existingNames.has(sp.name.toLowerCase())) {
                const models: LLMModel[] = sp.models.map((m, idx) => {
                  const backendId = toBackendId(sp.name, m)
                  return {
                    id: `m-${sp.name.toLowerCase()}-${idx}`,
                    name: m,
                    enabled: selected.has(backendId),
                    backendId,
                  }
                })

                newProviders.push({
                  id: crypto.randomUUID(),
                  name: sp.name,
                  apiKey: '***',
                  apiType: (sp.api_type as ApiType) || 'openai',
                  baseUrl: sp.base_url || undefined,
                  models,
                  expanded: false,
                })
              }
            }

            // Rebuild existing providers with fresh model lists from backend
            const updatedExisting = state.providers.map(p => {
              const saved = savedProviders.find(sp => sp.name.toLowerCase() === p.name.toLowerCase())
              if (!saved) return p

              const models: LLMModel[] = saved.models.map((m, idx) => {
                const backendId = toBackendId(p.name, m)
                const existing = p.models.find(em => em.name === m)
                return {
                  id: existing?.id || `m-${p.name.toLowerCase()}-${idx}`,
                  name: m,
                  enabled: existing?.enabled ?? selected.has(backendId),
                  backendId,
                }
              })

              return { ...p, models }
            })

            return {
              providers: [...updatedExisting, ...newProviders],
            }
          })
        } catch (error) {
          console.error('Erro ao buscar providers salvos:', error)
        }
      },

      addModelToProvider: async (providerName: string, modelName: string) => {
        try {
          const res = await fetch(`http://localhost:8001/api/providers/${providerName.toLowerCase()}/models`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_name: modelName }),
          })
          if (!res.ok) throw new Error('Failed to add model')

          const backendId = toBackendId(providerName, modelName)

          set((state) => ({
            providers: state.providers.map(p => {
              if (p.name.toLowerCase() !== providerName.toLowerCase()) return p
              // Don't add duplicate
              if (p.models.some(m => m.name === modelName)) return p
              return {
                ...p,
                models: [...p.models, {
                  id: `m-${providerName.toLowerCase()}-${Date.now()}`,
                  name: modelName,
                  enabled: false,
                  backendId,
                }],
              }
            }),
          }))
        } catch (error) {
          console.error('Erro ao adicionar modelo:', error)
          throw error
        }
      },

      removeModelFromProvider: async (providerName: string, modelName: string) => {
        try {
          await fetch(`http://localhost:8001/api/providers/${providerName.toLowerCase()}/models/${encodeURIComponent(modelName)}`, {
            method: 'DELETE',
          })

          const backendId = toBackendId(providerName, modelName)

          set((state) => ({
            providers: state.providers.map(p => {
              if (p.name.toLowerCase() !== providerName.toLowerCase()) return p
              return {
                ...p,
                models: p.models.filter(m => m.name !== modelName),
              }
            }),
            selectedBackendIds: state.selectedBackendIds.filter(id => id !== backendId),
          }))
        } catch (error) {
          console.error('Erro ao remover modelo:', error)
        }
      },

      updateProviderKey: async (providerName: string, newApiKey: string) => {
        try {
          const res = await fetch(`http://localhost:8001/api/providers/${providerName.toLowerCase()}/key`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: newApiKey }),
          })
          if (!res.ok) throw new Error('Failed to update key')

          set((state) => ({
            providers: state.providers.map(p =>
              p.name.toLowerCase() === providerName.toLowerCase()
                ? { ...p, apiKey: newApiKey }
                : p
            ),
          }))
        } catch (error) {
          console.error('Erro ao atualizar chave:', error)
          throw error
        }
      },

      removeProviderKey: async (providerName: string) => {
        try {
          await fetch(`http://localhost:8001/api/saved-providers/${providerName.toLowerCase()}`, { method: 'DELETE' })
        } catch (e) {
          console.error('Erro ao remover chave do backend:', e)
        }
        const prefix = providerName.toLowerCase() + '_'
        set((state) => ({
          providers: state.providers.filter((p) => p.name.toLowerCase() !== providerName.toLowerCase()),
          selectedBackendIds: state.selectedBackendIds.filter(id => !id.startsWith(prefix)),
        }))
      },

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
      name: 'nosesense-storage-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedBackendIds: state.selectedBackendIds,
      }),
    }
  )
)