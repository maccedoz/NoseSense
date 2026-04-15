'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import type { ApiType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
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
import { Plus, Building2, Key, Loader2, Globe } from 'lucide-react'

const API_TYPE_OPTIONS: { value: ApiType; label: string }[] = [
  { value: 'openai', label: 'OpenAI-compatible' },
  { value: 'google', label: 'Google GenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

export function AddProviderDialog() {
  const [open, setOpen] = useState(false)
  const [providerName, setProviderName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiType, setApiType] = useState<ApiType>('openai')
  const [baseUrl, setBaseUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { addProvider, providers } = useAppStore()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (providerName.trim() && apiKey.trim()) {
      // Check for duplicate
      if (providers.some(p => p.name.toLowerCase() === providerName.trim().toLowerCase())) {
        toast({
          variant: "destructive",
          title: "Duplicate Provider",
          description: "A provider with this name already exists.",
        })
        return
      }

      setIsSubmitting(true)

      try {
        await addProvider({
          name: providerName.trim(),
          apiKey: apiKey.trim(),
          apiType,
          baseUrl: baseUrl.trim() || undefined,
        })

        toast({
          title: "Success!",
          description: "Provider added successfully.",
        })

        setProviderName('')
        setApiKey('')
        setApiType('openai')
        setBaseUrl('')
        setOpen(false)
      } catch (error) {
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
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Add Provider
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add any AI provider with your API key. Then add models to it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Provider Name</label>
            <Input
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g. OpenAI, Groq, Together..."
              disabled={isSubmitting}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">API Type</label>
            <Select value={apiType} onValueChange={(v) => setApiType(v as ApiType)} disabled={isSubmitting}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select API type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {API_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-foreground">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {apiType === 'openai' && 'For OpenAI, Groq, Together, and other OpenAI-compatible APIs.'}
              {apiType === 'google' && 'For Google Gemini models via Google GenAI API.'}
              {apiType === 'anthropic' && 'For Anthropic Claude models.'}
            </p>
          </div>
          {apiType === 'openai' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Base URL <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g. https://api.together.xyz/v1"
                disabled={isSubmitting}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for OpenAI. Set for other OpenAI-compatible providers.
              </p>
            </div>
          )}
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
              disabled={!providerName.trim() || !apiKey.trim() || isSubmitting}
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