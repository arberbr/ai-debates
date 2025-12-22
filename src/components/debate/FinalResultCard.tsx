import { Card } from "@/components/ui/card";
import type { FinalResult } from "@/lib/types";

interface FinalResultCardProps {
  finalResult: FinalResult;
}

export const FinalResultCard = ({ finalResult }: FinalResultCardProps) => {
  const winnerColor = {
    yes: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    no: "bg-red-500/20 text-red-700 dark:text-red-400",
    tie: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  }[finalResult.winner || "tie"];

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/30 mt-8">
      <h3 className="text-2xl font-bold mb-5 text-foreground">Final Result</h3>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-foreground/80">Winner:</span>
          <div className={`px-5 py-2 rounded-lg font-bold text-lg ${winnerColor}`}>
            {finalResult.winner?.toUpperCase() || "TIE"}
          </div>
        </div>
        {finalResult.aggregateScore && (
          <div className="flex items-center gap-6 p-5 bg-background/50 rounded-lg border border-border">
            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-2 font-medium">FOR</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {finalResult.aggregateScore.yes.toFixed(1)}
              </div>
            </div>
            <div className="w-px h-16 bg-border"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-2 font-medium">AGAINST</div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {finalResult.aggregateScore.no.toFixed(1)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
