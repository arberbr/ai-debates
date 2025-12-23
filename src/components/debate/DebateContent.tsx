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
    <div className="border rounded-lg min-h-[400px] bg-muted/30 space-y-6">
      {!openingStatements && debateRounds.length === 0 && !conclusions && !error && (
        <output
          className="flex items-center justify-center h-full min-h-[300px]"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="text-center">
            <div
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
              aria-hidden="true"
            />
            <p className="text-center text-muted-foreground text-lg">
              {status || "Waiting for debate to start..."}
            </p>
            <span className="sr-only">
              Loading debate content: {status || "Waiting for debate to start..."}
            </span>
          </div>
        </output>
      )}

      {/* Opening Statements */}
      {openingStatements && (
        <section
          className="space-y-4 border-b border-border/50 pb-6"
          aria-labelledby="opening-statements-heading"
        >
          <div className="flex items-center gap-2">
            <h2
              id="opening-statements-heading"
              className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm"
            >
              Opening Statements
            </h2>
          </div>
          <div className="space-y-4">
            <DebateMessageCard message={openingStatements.yesStatement} side="yes" />
            <DebateMessageCard message={openingStatements.noStatement} side="no" />
          </div>
        </section>
      )}

      {/* Rebuttal Rounds */}
      {debateRounds.map((round) => (
        <section
          key={round.round}
          className="space-y-4 border-b border-border/50 pb-6 last:border-b-0 last:pb-0"
          aria-labelledby={`round-${round.round}-heading`}
        >
          <div className="flex items-center gap-2">
            <h2
              id={`round-${round.round}-heading`}
              className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm"
            >
              Round {round.round}
            </h2>
          </div>
          <div className="space-y-4">
            <DebateMessageCard message={round.yesMessage} side="yes" />
            <DebateMessageCard message={round.noMessage} side="no" />
          </div>
        </section>
      ))}

      {/* Conclusions */}
      {conclusions && (
        <section
          className="space-y-4 border-t border-border/50 pt-6 mt-6"
          aria-labelledby="conclusions-heading"
        >
          <div className="flex items-center gap-2">
            <h2
              id="conclusions-heading"
              className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm"
            >
              Conclusions
            </h2>
          </div>
          <div className="space-y-4">
            <DebateMessageCard message={conclusions.yesConclusion} side="yes" />
            <DebateMessageCard message={conclusions.noConclusion} side="no" />
          </div>
        </section>
      )}
    </div>
  );
};
