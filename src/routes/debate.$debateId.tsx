import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { DebateContent } from "@/components/debate/DebateContent";
import { FinalResultCard } from "@/components/debate/FinalResultCard";
import { JudgeEvaluationCard } from "@/components/debate/JudgeEvaluationCard";
import { UsageStatsCard } from "@/components/debate/UsageStatsCard";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlertWithActions } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiKey } from "@/hooks/useApiKey";
import { useDebateLoader } from "@/hooks/useDebateLoader";
import { useDebateSave } from "@/hooks/useDebateSave";
import { useDebateStream } from "@/hooks/useDebateStream";
import { cleanString } from "@/lib/debate-utils";
import { isCreditLimitError } from "@/lib/error-utils";

function DebateComponent() {
  const { debateId } = Route.useParams();
  const navigate = useNavigate();
  const { clearApiKey } = useApiKey();

  const { debateConfig, savedDebateState, configLoadError, isLoading } = useDebateLoader(debateId);

  const {
    status,
    displayTopic,
    openingStatements,
    debateRounds,
    conclusions,
    judgeEvaluations,
    finalResult,
    usage,
    isComplete,
    error,
    yesModel,
    noModel,
  } = useDebateStream({
    debateConfig: savedDebateState ? null : debateConfig, // Don't start stream for saved debates
    debateId,
    clearApiKey,
    onError: useCallback((errorMessage: string) => {
      console.error("Debate stream error:", errorMessage);
    }, []),
  });

  // Use saved debate state if available, otherwise use stream state
  const displayData = savedDebateState
    ? {
        status: "Debate loaded from saved data",
        displayTopic: cleanString(savedDebateState.topic || "Debate Chat"),
        openingStatements: savedDebateState.openingStatements || null,
        debateRounds: savedDebateState.debateRounds || [],
        conclusions: savedDebateState.conclusions || null,
        judgeEvaluations: savedDebateState.judgeEvaluations || [],
        finalResult: savedDebateState.finalResult,
        usage: savedDebateState.usage,
        isComplete: true,
        error: null,
        yesModel: savedDebateState.yesModel,
        noModel: savedDebateState.noModel,
      }
    : {
        status,
        displayTopic,
        openingStatements,
        debateRounds,
        conclusions,
        judgeEvaluations,
        finalResult,
        usage,
        isComplete,
        error,
        yesModel,
        noModel,
      };

  // Save debate to localStorage when complete (only for stream debates, not saved ones)
  useDebateSave({
    debateId,
    savedDebateState,
    displayData,
    debateConfig,
  });

  return (
    <main className="flex flex-col items-center justify-start p-8 bg-background">
      <a
        href="#debate-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      <FeatureErrorBoundary featureName="Debate View">
        <div className="w-full">
          {isLoading ? (
            <Card className="w-full animate-pulse">
              <CardHeader className="pb-4 border-b border-border">
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <Skeleton className="h-40 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className="text-2xl font-bold text-foreground leading-tight"
                    id="debate-title"
                  >
                    {displayData.displayTopic}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6" id="debate-content">
                <section className="space-y-6" aria-labelledby="debate-title">
                  {/* Status announcement for screen readers */}
                  <output aria-live="polite" aria-atomic="true" className="sr-only">
                    {displayData.status}
                  </output>
                  {configLoadError && (
                    <ErrorAlertWithActions
                      title="Configuration Error"
                      message={configLoadError}
                      primaryAction={{
                        label: "Start New Debate",
                        onClick: () => navigate({ to: "/" }),
                      }}
                      secondaryAction={{
                        label: "View All Debates",
                        onClick: () => navigate({ to: "/debates" }),
                      }}
                      className="mb-6"
                    />
                  )}
                  {displayData.error && (
                    <div>
                      <ErrorAlertWithActions title="Error occurred" message={displayData.error} />
                      {isCreditLimitError(displayData.error) && (
                        <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive/90">
                          This appears to be a credit limit issue. Please check your OpenRouter
                          account balance or try a different model.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Debate Content */}
                  <DebateContent
                    openingStatements={displayData.openingStatements}
                    debateRounds={displayData.debateRounds}
                    conclusions={displayData.conclusions}
                    status={displayData.status}
                    error={displayData.error}
                  />

                  {/* Judge Evaluations */}
                  {displayData.judgeEvaluations.length > 0 && (
                    <section className="space-y-6 mt-8" aria-labelledby="judge-evaluations-heading">
                      <h2
                        id="judge-evaluations-heading"
                        className="text-2xl font-bold text-foreground mb-6"
                      >
                        Judge Evaluations
                      </h2>
                      {displayData.judgeEvaluations.map((eval_) => (
                        <JudgeEvaluationCard key={eval_.judgeModel} evaluation={eval_} />
                      ))}
                    </section>
                  )}

                  {/* Final Result */}
                  {displayData.finalResult && (
                    <FinalResultCard finalResult={displayData.finalResult} />
                  )}

                  {/* Usage Statistics */}
                  {displayData.usage && displayData.isComplete && (
                    <UsageStatsCard usage={displayData.usage} />
                  )}

                  {displayData.isComplete && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={() => {
                          navigate({ to: "/" });
                        }}
                        variant="primary"
                        className="px-8 py-3 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Start a new debate"
                      >
                        Start New Debate
                      </Button>
                    </div>
                  )}
                </section>
              </CardContent>
            </Card>
          )}
        </div>
      </FeatureErrorBoundary>
    </main>
  );
}

export const Route = createFileRoute("/debate/$debateId")({
  component: DebateComponent,
});
