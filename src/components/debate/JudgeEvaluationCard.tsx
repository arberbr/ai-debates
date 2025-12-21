import type { JudgeEvaluation } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { MarkdownContent } from './MarkdownContent'

interface JudgeEvaluationCardProps {
  evaluation: JudgeEvaluation
}

export const JudgeEvaluationCard = ({ evaluation }: JudgeEvaluationCardProps) => {
  const winnerColor = {
    yes: 'bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30',
    no: 'bg-red-500/25 text-red-700 dark:text-red-300 border border-red-500/30',
    tie: 'bg-yellow-500/25 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30',
  }[evaluation.winner || 'tie']

  return (
    <Card className="p-6 border-2 border-border/60 shadow-lg hover:shadow-xl transition-all bg-card/50 backdrop-blur-sm">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b-2 border-border/40">
          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 bg-primary/15 text-primary font-bold rounded-lg text-sm border border-primary/20">
              Judge
            </div>
            <div className="font-semibold text-base text-foreground">
              {evaluation.judgeModel}
            </div>
          </div>
          {evaluation.winner && (
            <div className={`px-5 py-2 rounded-lg font-bold text-sm shadow-sm ${winnerColor}`}>
              Winner: {evaluation.winner.toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Scores Section */}
        {evaluation.scores && (
          <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 rounded-lg border border-border/50 shadow-inner">
            <div className="flex-1 text-center">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">FOR Score</div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 drop-shadow-sm">
                {evaluation.scores.yes}
              </div>
            </div>
            <div className="w-px h-16 bg-border/60"></div>
            <div className="flex-1 text-center">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">AGAINST Score</div>
              <div className="text-4xl font-bold text-red-600 dark:text-red-400 drop-shadow-sm">
                {evaluation.scores.no}
              </div>
            </div>
          </div>
        )}
        
        {/* Evaluation Text Section */}
        <div className="pt-4">
          <div className="text-base font-bold text-foreground mb-4 pb-2 border-b border-border/30">
            Evaluation
          </div>
          <div className="prose prose-base dark:prose-invert max-w-none">
            <div className="text-[15px] leading-7 text-foreground/95 space-y-4 px-2">
              <MarkdownContent content={evaluation.reasoning || evaluation.evaluation} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

