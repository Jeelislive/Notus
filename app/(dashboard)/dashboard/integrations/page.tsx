import type { Metadata } from 'next'
import { getIntegrations } from '@/app/actions/integrations'
import { IntegrationsHub } from '@/components/dashboard/integrations/integrations-hub'

export const metadata: Metadata = { title: 'Integrations | Notus' }

export default async function IntegrationsPage() {
  const integrations = await getIntegrations()
  const connectedProviders = integrations.map((i) => i.provider)

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Integrations</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Connect your tools to automatically sync meeting notes, action items, and insights.
        </p>
      </div>
      <IntegrationsHub connectedProviders={connectedProviders} integrations={integrations} />
    </div>
  )
}
