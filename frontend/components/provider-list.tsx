'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Building2, ChevronDown, Key, Bot, Plus, X, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export function ProviderList() {
  const { providers, removeProviderKey, updateProviderKey, toggleProviderExpanded, toggleModel, toggleAllModels, addModelToProvider, removeModelFromProvider } = useAppStore()
  const { toast } = useToast()
  const [addingModelFor, setAddingModelFor] = useState<string | null>(null)
  const [newModelName, setNewModelName] = useState('')
  const [editingKeyFor, setEditingKeyFor] = useState<string | null>(null)
  const [newKeyValue, setNewKeyValue] = useState('')

  const handleAddModel = async (providerName: string) => {
    if (!newModelName.trim()) return
    try {
      await addModelToProvider(providerName, newModelName.trim())
      toast({ title: "Model added!", description: `"${newModelName.trim()}" added to ${providerName}.` })
      setNewModelName('')
      setAddingModelFor(null)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to add model." })
    }
  }

  const handleUpdateKey = async (providerName: string) => {
    if (!newKeyValue.trim()) return
    try {
      await updateProviderKey(providerName, newKeyValue.trim())
      toast({ title: "Key updated!", description: `API key for ${providerName} updated.` })
      setNewKeyValue('')
      setEditingKeyFor(null)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update API key." })
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Providers
      </h3>
      <div className="space-y-2">
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No providers registered. Add a provider to get started.
          </p>
        ) : (
          providers.map((provider) => {
            const enabledCount = provider.models.filter(m => m.enabled).length
            
            return (
              <div key={provider.id} className="space-y-1">
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer group",
                    provider.expanded
                      ? "bg-primary/10 border-primary/50"
                      : "bg-secondary/50 border-border hover:border-primary/30"
                  )}
                  onClick={() => toggleProviderExpanded(provider.id)}
                >
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    provider.expanded ? "text-primary" : "text-muted-foreground -rotate-90"
                  )} />
                  <Building2 className={cn(
                    "w-4 h-4",
                    provider.expanded ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1">
                    <span className={cn(
                      "text-sm font-medium",
                      provider.expanded ? "text-primary" : "text-foreground"
                    )}>
                      {provider.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {provider.models.length} model(s)
                      </span>
                      {enabledCount > 0 && (
                        <span className="text-xs text-primary font-medium">
                          {enabledCount} selected
                        </span>
                      )}
                    </div>
                  </div>
                  {provider.apiKey && (
                    <Key className="w-3 h-3 text-accent" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="transition-opacity h-8 w-8 text-muted-foreground hover:text-primary"
                    title="Edit API Key"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingKeyFor(editingKeyFor === provider.id ? null : provider.id)
                      setNewKeyValue('')
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeProviderKey(provider.name)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Edit Key Inline */}
                {editingKeyFor === provider.id && (
                  <div className="flex items-center gap-2 px-3 pb-2" onClick={(e) => e.stopPropagation()}>
                    <Key className="w-3 h-3 text-muted-foreground" />
                    <Input
                      type="password"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      placeholder="New API key..."
                      className="h-8 text-sm bg-input border-border flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleUpdateKey(provider.name)
                        }
                        if (e.key === 'Escape') {
                          setEditingKeyFor(null)
                          setNewKeyValue('')
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-primary hover:text-primary"
                      onClick={() => handleUpdateKey(provider.name)}
                      disabled={!newKeyValue.trim()}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setEditingKeyFor(null)
                        setNewKeyValue('')
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                {/* Models Dropdown */}
                {provider.expanded && (
                  <div className="ml-6 pl-4 border-l-2 border-primary/30 space-y-1 py-2">
                    {/* Select All toggle */}
                    {provider.models.length > 1 && (
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors border-b border-border/50 mb-1">
                        <Checkbox
                          id={`${provider.id}-all`}
                          checked={provider.models.every(m => m.enabled)}
                          onCheckedChange={(checked) => toggleAllModels(provider.id, !!checked)}
                          className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label
                          htmlFor={`${provider.id}-all`}
                          className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer"
                        >
                          Select All
                        </label>
                      </div>
                    )}

                    {provider.models.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 italic">
                        No models added yet. Click the button below to add models.<br/>
                        Use the exact model name as listed in the provider&apos;s API docs.
                      </p>
                    )}

                    {provider.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group/model"
                      >
                        <Checkbox
                          id={model.id}
                          checked={model.enabled}
                          onCheckedChange={() => toggleModel(provider.id, model.id)}
                          className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Bot className="w-3 h-3 text-muted-foreground" />
                        <label
                          htmlFor={model.id}
                          className="flex-1 text-sm cursor-pointer text-foreground"
                        >
                          {model.name}
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover/model:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeModelFromProvider(provider.name, model.name)
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Add Model */}
                    {addingModelFor === provider.id ? (
                      <div className="space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                        <Input
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                          placeholder="e.g. gpt-4o, gemini-2.5-flash..."
                          className="h-8 text-sm bg-input border-border"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddModel(provider.name)
                            }
                            if (e.key === 'Escape') {
                              setAddingModelFor(null)
                              setNewModelName('')
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-primary hover:text-primary"
                          onClick={() => handleAddModel(provider.name)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setAddingModelFor(null)
                            setNewModelName('')
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Type the exact model name as listed in the provider&apos;s API (e.g. <code className="text-primary/80">gpt-4o</code>, not <code className="text-primary/80">GPT 4o</code>).
                        </p>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs text-primary/70 hover:text-primary mt-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddingModelFor(provider.id)
                          setNewModelName('')
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Model
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
