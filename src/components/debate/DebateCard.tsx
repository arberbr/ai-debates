import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cleanString } from "@/lib/debate-utils";
import type { SavedDebate } from "@/lib/types";
import {
  calculateTotalReadingTimeForSide,
  formatDate24Hour,
  getDebateTitle,
  getModelName,
} from "@/lib/utils";

interface DebateCardProps {
  debate: SavedDebate;
  onCardClick: (debateId: string) => void;
  onDeleteClick: (debate: { id: string; title: string }) => void;
}

/**
 * Individual debate card component for the debates list
 * Memoized to prevent unnecessary re-renders
 */
export const DebateCard = memo(({ debate, onCardClick, onDeleteClick }: DebateCardProps) => {
  const formattedDate = formatDate24Hour(debate.timestamp);
  const yesReadingTime = calculateTotalReadingTimeForSide(debate, "yes");
  const noReadingTime = calculateTotalReadingTimeForSide(debate, "no");
  const debateTitle = cleanString(getDebateTitle(debate.topic));

  const handleCardClick = useCallback(() => {
    onCardClick(debate.debateId);
  }, [debate.debateId, onCardClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteClick({ id: debate.debateId, title: debateTitle });
    },
    [debate.debateId, debateTitle, onDeleteClick]
  );

  return (
    <Card
      className="border-0 cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View debate: ${debateTitle}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{debateTitle}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
            aria-label={`Delete debate "${debateTitle}"`}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          <div className="font-semibold mb-1">Models:</div>
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span>FOR: {getModelName(debate.yesModel)}</span>
              <span className="opacity-70">{yesReadingTime}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>AGAINST: {getModelName(debate.noModel)}</span>
              <span className="opacity-70">{noReadingTime}</span>
            </div>
          </div>
        </div>
        <div className="text-sm">
          <div className="font-semibold">Rounds: {debate.debateRounds?.length || 0}</div>
        </div>
        {debate.finalResult?.winner && (
          <div className="text-sm">
            <div className="font-semibold">Winner: {debate.finalResult.winner.toUpperCase()}</div>
          </div>
        )}
        {debate.usage && (
          <div className="text-sm pt-2">
            <div className="font-semibold mb-1">Usage:</div>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>Tokens:</span>
                <span className="opacity-70">
                  {debate.usage.total_tokens?.toLocaleString() || "0"}
                </span>
              </div>
              {debate.usage.cost !== undefined && (
                <div className="flex items-center justify-between gap-2">
                  <span>Cost:</span>
                  <span className="opacity-70 font-semibold">${debate.usage.cost.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="text-xs opacity-70 dark:opacity-60 pt-2 border-t border-current/20 dark:border-current/30">
          {formattedDate}
        </div>
      </CardContent>
    </Card>
  );
});

DebateCard.displayName = "DebateCard";
