'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { IntegrationSheet } from './integration-sheet'

interface IntegrationField {
  key: string
  label: string
  placeholder: string
  type: string
  helpText?: string
}

interface IntegrationMeta {
  id: 'jira' | 'slack' | 'notion' | 'linear' | 'github'
  name: string
  description: string
  color: string
  bgColor: string
  category: string
  fields: IntegrationField[]
  siPath: string
}

interface IntegrationCardProps {
  integration: IntegrationMeta
  isConnected: boolean
  existingConfig?: Record<string, string>
  onConnected: () => void
  onDisconnected: () => void
}

export function IntegrationCard({
  integration,
  isConnected,
  existingConfig,
  onConnected,
  onDisconnected,
}: IntegrationCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="group w-full text-left rounded-2xl border border-border bg-background p-5 hover:border-border/80 hover:shadow-md hover:shadow-black/5 active:scale-[0.99] transition-all duration-150"
        style={{ transition: 'transform 100ms ease, box-shadow 150ms ease, border-color 150ms ease' }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`size-11 rounded-xl ${integration.bgColor} flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105`}>
            <svg
              role="img"
              viewBox="0 0 24 24"
              className="size-5"
              style={{ fill: integration.color }}
              aria-hidden="true"
            >
              <path d={integration.siPath} />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-[11px] font-semibold">
                <CheckCircle2 className="size-3" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Configure
                <ChevronRight className="size-3" />
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[15px] font-semibold text-foreground">{integration.name}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
              {integration.category}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground leading-snug">{integration.description}</p>
        </div>
      </button>

      <IntegrationSheet
        integration={integration}
        isConnected={isConnected}
        existingConfig={existingConfig}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
      />
    </>
  )
}
