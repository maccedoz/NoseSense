'use client'

import React, { useEffect } from 'react'
import { Header } from '@/components/header'
import { ProviderList } from '@/components/provider-list'
import { AddProviderDialog } from '@/components/add-llm-dialog'
import { ProcessRunner } from '@/components/process-runner'
import { ErrorList } from '@/components/error-list'
import { ResultsTable } from '@/components/results-table'
import { FinalResultsTable } from '@/components/final-results-table'
import { AnalysisTab } from '@/components/analysis-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'

export default function Home() {
  const { status, results, fetchSavedProviders, fetchPreviousResults } = useAppStore()
  
  useEffect(() => {
    fetchSavedProviders()
    fetchPreviousResults()
  }, [fetchSavedProviders, fetchPreviousResults])
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-balance gradient-text">
            NoseSense
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Platform for detecting and analyzing Test Smells with multiple LLMs simultaneously.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Providers Section */}
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
            
            {/* Execution Section */}
            <div 
              className="p-6 rounded-xl bg-card border border-border hover-lift animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              <ProcessRunner />
            </div>
            
            <ErrorList />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            <div 
              className="p-6 rounded-xl bg-card border border-border min-h-[600px] hover-lift animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <Tabs defaultValue="processing" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-secondary/50 p-1 rounded-lg">
                  <TabsTrigger value="processing" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">Processing</TabsTrigger>
                  <TabsTrigger value="results" disabled={results.length === 0} className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                    Results
                  </TabsTrigger>
                  <TabsTrigger value="analysis" disabled={results.length === 0} className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                    Analysis
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="processing" className="mt-0">
                  <ResultsTable />
                </TabsContent>
                
                <TabsContent value="results" className="mt-0">
                  <FinalResultsTable />
                </TabsContent>
                
                <TabsContent value="analysis" className="mt-0">
                  <AnalysisTab />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 Aries Lab. Undergraduate Research Project by Magno Macedo.</p>
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
