'use client'

import React, { useEffect } from 'react'
import { Header } from '@/components/header'
import { ProviderList } from '@/components/provider-list'
import { AddProviderDialog } from '@/components/add-llm-dialog'
import { OpenProcessRunner } from '@/components/open-process-runner'
import { OpenResultsTable } from '@/components/open-results-table'
import { OpenFinalResultsTable } from '@/components/open-final-results-table'
import { OpenAnalysisTab } from '@/components/open-analysis-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'
import { FlaskConical } from 'lucide-react'

export default function OpenPage() {
  const { openResults, fetchSavedProviders, fetchPreviousOpenResults } = useAppStore()

  useEffect(() => {
    fetchSavedProviders()
    fetchPreviousOpenResults()
  }, [fetchSavedProviders, fetchPreviousOpenResults])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium mb-4">
            <FlaskConical className="w-3 h-3" />
            Open Prompt Mode
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-balance gradient-text">
            NoseSense
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Open-ended prompt — the LLM answers freely with the smell name, without fixed alternatives.
            Responses are normalized automatically to canonical names.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <div
              className="p-6 rounded-xl bg-card border border-border hover-lift animate-slide-up"
              style={{ animationDelay: '0.1s' }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Providers
              </h2>
              <div className="space-y-6">
                <ProviderList />
                <AddProviderDialog />
              </div>
            </div>

            <div
              className="p-6 rounded-xl bg-card border border-amber-500/20 hover-lift animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              <OpenProcessRunner />
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <div
              className="p-6 rounded-xl bg-card border border-border min-h-[600px] hover-lift animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <Tabs defaultValue="processing" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-secondary/50 p-1 rounded-lg">
                  <TabsTrigger value="processing" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                    Processing
                  </TabsTrigger>
                  <TabsTrigger value="results" disabled={openResults.length === 0} className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                    Results
                  </TabsTrigger>
                  <TabsTrigger value="analysis" disabled={openResults.length === 0} className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                    Analysis
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="processing" className="mt-0">
                  <OpenResultsTable />
                </TabsContent>

                <TabsContent value="results" className="mt-0">
                  <OpenFinalResultsTable />
                </TabsContent>

                <TabsContent value="analysis" className="mt-0">
                  <OpenAnalysisTab />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <footer className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            {/* <p>© 2026 Aries Lab. Undergraduate Research Project by Magno Macedo.</p> */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                <span className="text-xs font-bold text-primary">AL</span>
              </div>
              <span className="font-medium">Aries Lab</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
