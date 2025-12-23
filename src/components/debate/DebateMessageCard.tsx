import { memo, useMemo } from "react";
import type { DebateMessage } from "@/lib/types";
import { calculateReadingTime } from "@/lib/utils";
import { MarkdownContent } from "./MarkdownContent";

interface DebateMessageCardProps {
  message: DebateMessage;
  side: "yes" | "no";
}

export const DebateMessageCard = memo(({ message, side }: DebateMessageCardProps) => {
  const isYes = side === "yes";
  const bgColor = isYes ? "bg-blue-500/10" : "bg-red-500/10";
  const borderColor = isYes ? "border-blue-500/20" : "border-red-500/20";
  const badgeBg = isYes ? "bg-blue-600" : "bg-red-600";
  const label = isYes ? "FOR" : "AGAINST";

  const readingTime = useMemo(() => calculateReadingTime(message.content), [message.content]);

  return (
    <article
      className={`p-5 ${bgColor} rounded-lg border ${borderColor}`}
      aria-labelledby={`${side}-header`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 ${badgeBg} text-white font-semibold rounded-md text-sm`}
            title={`Position: ${label}`}
          >
            {label}
          </div>
          <div
            className="text-sm text-muted-foreground font-medium"
            title={`Model: ${message.model}`}
          >
            {message.model}
          </div>
        </div>
        <div className="text-xs text-muted-foreground" title={`Reading time: ${readingTime}`}>
          {readingTime}
        </div>
      </div>
      <div className="text-base leading-relaxed">
        <MarkdownContent content={message.content} />
      </div>
    </article>
  );
});

DebateMessageCard.displayName = "DebateMessageCard";
