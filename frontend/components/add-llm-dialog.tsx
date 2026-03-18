'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast' // Import do Toast
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Building2, Key, Loader2 } from 'lucide-react' // Adicionei o Loader2 para o botão

const AVAILABLE_PROVIDERS = [
  'OpenAI',
  'TogetherAI',
  'GoogleAI',
  'AnthropicAI'
]

export function AddProviderDialog() {
  const [open, setOpen] = useState(false)
  const [providerName, setProviderName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false) // Novo estado de loading
  
  const { addProvider, providers } = useAppStore()
  const { toast } = useToast() // Instanciando o Toast

  const availableProviders = AVAILABLE_PROVIDERS.filter(
    (p) => !providers.some((existing) => existing.name === p)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (providerName && apiKey.trim()) {
      setIsSubmitting(true)

      try {
        // 1. Envia para o Backend (Python)
        // Lembre-se de checar se a sua URL exata é /api/create-key ou só /create-key
        const response = await fetch('http://localhost:8001/api/create-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            empresa: providerName.toLowerCase(), // Opcional: mandando em minúsculo para padronizar
            chave_api: apiKey.trim()
          })
        })

        const data = await response.json()

        if (response.ok) {
          // 2. Se o Python confirmou, salva no estado global do Front
          addProvider({ name: providerName, apiKey: apiKey.trim() })
          
          toast({
            title: "Success!",
            description: "API key saved on the server.",
          })

          // 3. Limpa e fecha o modal
          setProviderName('')
          setApiKey('')
          setOpen(false)
        } else {
          // Erro retornado pelo Pydantic/FastAPI
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: data.detail || "Check the submitted data.",
          })
        }
      } catch (error) {
        // Erro de rede (Backend fora do ar ou CORS)
        toast({
          variant: "destructive",
            title: "Connection Error",
            description: "Could not connect to the backend.",
        })
        console.error("Falha ao salvar no backend:", error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
          disabled={availableProviders.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          {availableProviders.length === 0 ? 'All providers added' : 'Add Provider'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Add Provider
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select the provider and add the API key to use their models.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Provider</label>
            <Select value={providerName} onValueChange={setProviderName} disabled={isSubmitting}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {availableProviders.map((provider) => (
                  <SelectItem key={provider} value={provider} className="text-foreground">
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium text-foreground flex items-center gap-1">
              <Key className="w-3 h-3" />
              API Key
            </label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              disabled={isSubmitting}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="border-border text-foreground hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!providerName || !apiKey.trim() || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}