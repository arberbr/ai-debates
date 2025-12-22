import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebates } from "@/hooks/useDebates";
import { MODEL_OPTIONS } from "@/lib/constants";
import { cleanString } from "@/lib/debate-utils";
import { calculateTotalReadingTimeForSide, formatDate24Hour } from "@/lib/utils";

function DebatesComponent() {
  const navigate = useNavigate();
  const { debates: savedDebates, deleteDebate } = useDebates();

  const getModelName = (slug: string) => {
    const model = MODEL_OPTIONS.find((m) => m.slug === slug);
    return model ? model.name : slug;
  };

  // Color palette for debate cards (with dark mode support)
  const cardColors = [
    {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800/50",
      text: "text-blue-900 dark:text-blue-100",
    },
    {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800/50",
      text: "text-purple-900 dark:text-purple-100",
    },
    {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800/50",
      text: "text-green-900 dark:text-green-100",
    },
    {
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      border: "border-yellow-200 dark:border-yellow-800/50",
      text: "text-yellow-900 dark:text-yellow-100",
    },
    {
      bg: "bg-pink-50 dark:bg-pink-950/30",
      border: "border-pink-200 dark:border-pink-800/50",
      text: "text-pink-900 dark:text-pink-100",
    },
    {
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      border: "border-indigo-200 dark:border-indigo-800/50",
      text: "text-indigo-900 dark:text-indigo-100",
    },
    {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-200 dark:border-orange-800/50",
      text: "text-orange-900 dark:text-orange-100",
    },
    {
      bg: "bg-teal-50 dark:bg-teal-950/30",
      border: "border-teal-200 dark:border-teal-800/50",
      text: "text-teal-900 dark:text-teal-100",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <div className="w-full">
        {savedDebates.length === 0 ? (
          <EmptyState
            title="No debates found"
            description="Start a new debate from the Home page to see it here."
            actionLabel="Go to Home"
            actionTo="/"
          />
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">All Debates</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {savedDebates.length} {savedDebates.length === 1 ? "debate" : "debates"} found
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {savedDebates.map((debate, index) => {
                const colorScheme = cardColors[index % cardColors.length];
                const formattedDate = formatDate24Hour(debate.timestamp);
                const yesReadingTime = calculateTotalReadingTimeForSide(debate, "yes");
                const noReadingTime = calculateTotalReadingTimeForSide(debate, "no");

                const handleCardClick = () => {
                  navigate({
                    to: "/debate/$debateId",
                    params: { debateId: debate.debateId },
                  });
                };

                return (
                  <Card
                    key={debate.debateId}
                    className={`${colorScheme.bg} ${colorScheme.border} border-2 cursor-pointer hover:shadow-lg transition-shadow`}
                    onClick={handleCardClick}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className={`text-lg ${colorScheme.text} line-clamp-2`}>
                          {cleanString(debate.topic || "Untitled Debate")}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const debateTitle = cleanString(debate.topic || "Untitled Debate");
                            const confirmed = window.confirm(
                              `Are you sure you want to delete "${debateTitle}"?\n\nThis action cannot be undone.`
                            );
                            if (confirmed) {
                              deleteDebate(debate.debateId);
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                        >
                          x
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className={`${colorScheme.text} space-y-2`}>
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
                        <div className="font-semibold">
                          Rounds: {debate.debateRounds?.length || 0}
                        </div>
                      </div>
                      {debate.finalResult?.winner && (
                        <div className="text-sm">
                          <div className="font-semibold">
                            Winner: {debate.finalResult.winner.toUpperCase()}
                          </div>
                        </div>
                      )}
                      {debate.usage && (
                        <div className="text-sm pt-2 border-t border-current/20 dark:border-current/30">
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
                                <span className="opacity-70 font-semibold">
                                  ${debate.usage.cost.toFixed(4)}
                                </span>
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
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/debates")({
  component: DebatesComponent,
});
