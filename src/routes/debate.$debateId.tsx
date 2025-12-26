import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DebateContent } from "@/components/debate/DebateContent";
import { FinalResultCard } from "@/components/debate/FinalResultCard";
import { JudgeEvaluationCard } from "@/components/debate/JudgeEvaluationCard";
import { UsageStatsCard } from "@/components/debate/UsageStatsCard";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiKey } from "@/hooks/useApiKey";
import { useDebateSave } from "@/hooks/useDebateSave";
import { useDebateStream } from "@/hooks/useDebateStream";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { STORAGE_KEYS } from "@/lib/constants";
import { cleanString } from "@/lib/debate-utils";
import { debateConfigSchema } from "@/lib/schemas";
import type { DebateConfig, SavedDebate } from "@/lib/types";

function DebateComponent() {
  const { debateId } = Route.useParams();
  const navigate = useNavigate();
  const [debateConfig, setDebateConfig] = useState<DebateConfig | null>(null);
  const [savedDebateState, setSavedDebateState] = useState<SavedDebate | null>(null);
  const [configLoadError, setConfigLoadError] = useState<string | null>(null);

  const { clearApiKey } = useApiKey();
  const { getItem } = useLocalStorage();

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

  // Load saved debate or config on mount
  useEffect(() => {
    setConfigLoadError(null);

    try {
      // First, check if this debate is already saved in localStorage
      const savedDebates = getItem<SavedDebate[]>(STORAGE_KEYS.SAVED_DEBATES, []);
      if (savedDebates && Array.isArray(savedDebates)) {
        const savedDebate = savedDebates.find((d) => d.debateId === debateId);

        if (savedDebate?.debateRounds && savedDebate.debateRounds.length > 0) {
          setSavedDebateState(savedDebate);
          return; // Don't load config if debate is already saved
        }
      }

      // Try to load config from pending debates (new debates)
      const pendingDebates = getItem<Record<string, DebateConfig>>(
        STORAGE_KEYS.PENDING_DEBATES,
        {}
      );

      if (!pendingDebates || typeof pendingDebates !== "object") {
        setConfigLoadError("No pending debates found. Please start a new debate.");
        console.error("No pending debates found in localStorage for debateId:", debateId);
        return;
      }

      const rawConfig = pendingDebates[debateId] || null;

      if (!rawConfig) {
        setConfigLoadError(
          `No debate configuration found for ID: ${debateId}. Please start a new debate.`
        );
        console.error("No config found for debateId:", debateId);
        return;
      }

      // Validate config with Zod
      const validationResult = debateConfigSchema.safeParse(rawConfig);

      if (!validationResult.success) {
        const errorMsg = "Invalid debate configuration: missing required fields or invalid format.";
        setConfigLoadError(errorMsg);
        console.error("Invalid config found:", {
          errors: validationResult.error.format(),
          config: rawConfig,
        });
        return;
      }

      const config = validationResult.data;

      // Set the config - this will trigger useDebateStream to start
      setDebateConfig({
        debateId: config.debateId || debateId,
        topic: config.topic,
        yesModel: config.yesModel,
        noModel: config.noModel,
        rounds: config.rounds || "3",
        judgePrompt: config.judgePrompt || "",
        timestamp: config.timestamp || new Date().toISOString(),
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "An unexpected error occurred while loading the debate.";
      setConfigLoadError(errorMessage);
      console.error("Error loading pending debate config:", e);
    }
  }, [debateId, getItem]);

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

  // Add loading check
  const isLoading = !debateConfig && !savedDebateState && !configLoadError;

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
                    <div
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                      className="p-5 bg-destructive/10 border-2 border-destructive/30 text-destructive rounded-lg mb-6"
                    >
                      <div className="font-bold text-lg mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <title>Configuration Error</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Configuration Error</span>
                      </div>
                      <div className="text-base whitespace-pre-wrap leading-relaxed">
                        {configLoadError}
                      </div>
                      <div className="mt-4">
                        <Button
                          onClick={() => navigate({ to: "/" })}
                          variant="primary"
                          className="mr-2"
                        >
                          Start New Debate
                        </Button>
                        <Button onClick={() => navigate({ to: "/debates" })} variant="outline">
                          View All Debates
                        </Button>
                      </div>
                    </div>
                  )}
                  {displayData.error && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                      className="p-5 bg-destructive/10 border-2 border-destructive/30 text-destructive rounded-lg"
                    >
                      <div className="font-bold text-lg mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <title>Error</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Error occurred</span>
                      </div>
                      <div className="text-base whitespace-pre-wrap leading-relaxed">
                        {displayData.error}
                      </div>
                      {displayData.error.includes("credits") ||
                      displayData.error.includes("402") ? (
                        <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive/90">
                          This appears to be a credit limit issue. Please check your OpenRouter
                          account balance or try a different model.
                        </div>
                      ) : null}
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
