'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Building2, ChevronDown, Key, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProviderList() {
  const { providers, removeProvider, toggleProviderExpanded, toggleModel } = useAppStore()

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Empresas / Provedores
      </h3>
      <div className="space-y-2">
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma empresa cadastrada. Adicione uma empresa para comecar.
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
                        {provider.models.length} modelo(s)
                      </span>
                      {enabledCount > 0 && (
                        <span className="text-xs text-primary font-medium">
                          {enabledCount} selecionado(s)
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeProvider(provider.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Models Dropdown */}
                {provider.expanded && (
                  <div className="ml-6 pl-4 border-l-2 border-primary/30 space-y-1 py-2">
                    {provider.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
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
                      </div>
                    ))}
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
