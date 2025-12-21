import type { UsageData } from '@/lib/types'
import { Card } from '@/components/ui/card'

interface UsageStatsCardProps {
  usage: UsageData
}

export const UsageStatsCard = ({ usage }: UsageStatsCardProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-muted/40 via-muted/30 to-muted/40 border-2 border-border/50 shadow-lg mt-8">
      <h3 className="text-2xl font-bold mb-5 text-foreground">Token Usage & Cost</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Total Tokens</div>
            <div className="text-2xl font-bold text-foreground">
              {usage.total_tokens?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Prompt Tokens</div>
            <div className="text-2xl font-bold text-foreground">
              {usage.prompt_tokens?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Completion Tokens</div>
            <div className="text-2xl font-bold text-foreground">
              {usage.completion_tokens?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Total Cost</div>
            <div className="text-2xl font-bold text-primary dark:text-yellow-500">
              ${usage.cost?.toFixed(4) || '0.0000'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

