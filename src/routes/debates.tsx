import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebates } from "@/hooks/useDebates";
import { cleanString } from "@/lib/debate-utils";
import { calculateTotalReadingTimeForSide, formatDate24Hour, getModelName } from "@/lib/utils";

function DebatesComponent() {
  const navigate = useNavigate();
  const { debates: savedDebates, deleteDebate, isLoading } = useDebates();

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <FeatureErrorBoundary featureName="Debates List">
        <div className="w-full">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mb-6" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : savedDebates.length === 0 ? (
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
                {savedDebates.map((debate) => {
                  const formattedDate = formatDate24Hour(debate.timestamp);
                  const yesReadingTime = calculateTotalReadingTimeForSide(debate, "yes");
                  const noReadingTime = calculateTotalReadingTimeForSide(debate, "no");

                  const handleCardClick = () => {
                    navigate({
                      to: "/debate/$debateId",
                      params: { debateId: debate.debateId },
                    });
                  };

                  const handleKeyDown = (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCardClick();
                    }
                  };

                  return (
                    <Card
                      key={debate.debateId}
                      className={`border-0 cursor-pointer`}
                      onClick={handleCardClick}
                      onKeyDown={handleKeyDown}
                      tabIndex={0}
                      role="button"
                      aria-label={`View debate: ${cleanString(debate.topic || "Untitled Debate")}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className={`text-lg line-clamp-2`}>
                            {cleanString(debate.topic || "Untitled Debate")}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const debateTitle = cleanString(debate.topic || "Untitled Debate");
                              const confirmed = window.confirm(
                                `Are you sure you want to delete "${debateTitle}"?\n\nThis action cannot be undone.`
                              );
                              if (confirmed) {
                                try {
                                  deleteDebate(debate.debateId);
                                  toast.success("Debate deleted successfully");
                                } catch (error) {
                                  toast.error("Failed to delete debate. Please try again.");
                                  console.error("Delete error:", error);
                                }
                              }
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                            aria-label={`Delete debate "${debate.topic || "Untitled Debate"}"`}
                          >
                            ×
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className={`space-y-2`}>
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
      </FeatureErrorBoundary>
    </div>
  );
}

export const Route = createFileRoute("/debates")({
  component: DebatesComponent,
});
