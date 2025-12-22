import type { Conclusions, DebateRound, OpeningStatements } from "@/lib/types";
import { DebateMessageCard } from "./DebateMessageCard";

interface DebateContentProps {
  openingStatements?: OpeningStatements | null;
  debateRounds: DebateRound[];
  conclusions?: Conclusions | null;
  status: string;
  error: string | null;
}

export const DebateContent = ({
  openingStatements,
  debateRounds,
  conclusions,
  status,
  error,
}: DebateContentProps) => {
  return (
    <div className="border rounded-lg min-h-[400px] bg-muted/30 space-y-6 max-h-[700px] overflow-y-auto shadow-sm p-6">
      {!openingStatements && debateRounds.length === 0 && !conclusions && !error && (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-center text-muted-foreground text-lg">
            {status || "Waiting for debate to start..."}
          </p>
        </div>
      )}

      {/* Opening Statements */}
      {openingStatements && (
        <div className="space-y-4 border-b border-border/50 pb-6">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm">
              Opening Statements
            </div>
          </div>
          <div className="space-y-4">
            <DebateMessageCard message={openingStatements.yesStatement} side="yes" />
            <DebateMessageCard message={openingStatements.noStatement} side="no" />
          </div>
        </div>
      )}

      {/* Rebuttal Rounds */}
      {debateRounds.map((round) => (
        <div
          key={round.round}
          className="space-y-4 border-b border-border/50 pb-6 last:border-b-0 last:pb-0"
        >
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm">
              Round {round.round}
            </div>
          </div>
          <div className="space-y-4">
            <DebateMessageCard message={round.yesMessage} side="yes" />
            <DebateMessageCard message={round.noMessage} side="no" />
          </div>
        </div>
      ))}

      {/* Conclusions */}
      {conclusions && (
        <div className="space-y-4 border-t border-border/50 pt-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm">
              Conclusions
            </div>
          </div>
          <div className="space-y-4">
            <DebateMessageCard message={conclusions.yesConclusion} side="yes" />
            <DebateMessageCard message={conclusions.noConclusion} side="no" />
          </div>
        </div>
      )}
    </div>
  );
};
