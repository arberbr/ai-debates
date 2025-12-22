import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DebateContent } from "@/components/debate/DebateContent";
import { FinalResultCard } from "@/components/debate/FinalResultCard";
import { JudgeEvaluationCard } from "@/components/debate/JudgeEvaluationCard";
import { UsageStatsCard } from "@/components/debate/UsageStatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiKey } from "@/hooks/useApiKey";
import { useDebates } from "@/hooks/useDebates";
import { getApiBaseUrl, STORAGE_KEYS, TIMING } from "@/lib/constants";
import { cleanString } from "@/lib/debate-utils";
import type {
  Conclusions,
  DebateConfig,
  DebateRound,
  FinalResult,
  JudgeEvaluation,
  OpeningStatements,
  SavedDebate,
  UsageData,
} from "@/lib/types";

interface SSEEventData {
  stage: string;
  message?: string;
  data?:
    | { title: string }
    | OpeningStatements
    | DebateRound
    | { round: number }
    | Conclusions
    | JudgeEvaluation
    | { finalResult: FinalResult }
    | {
        title?: string;
        yesModel?: string;
        noModel?: string;
        openingStatements?: OpeningStatements;
        rounds?: DebateRound[];
        conclusions?: Conclusions;
        judgeEvaluations?: JudgeEvaluation[];
        finalResult?: FinalResult;
        usage?: UsageData;
      }
    | Record<string, unknown>;
}

function DebateComponent() {
  const { debateId } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Initializing...");
  const [displayTopic, setDisplayTopic] = useState<string>("Debate Chat");
  const [openingStatements, setOpeningStatements] = useState<OpeningStatements | null>(null);
  const [debateRounds, setDebateRounds] = useState<DebateRound[]>([]);
  const [conclusions, setConclusions] = useState<Conclusions | null>(null);
  const [judgeEvaluations, setJudgeEvaluations] = useState<JudgeEvaluation[]>([]);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [usage, setUsage] = useState<UsageData | undefined>(undefined);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yesModel, setYesModel] = useState<string>("");
  const [noModel, setNoModel] = useState<string>("");
  const hasStartedRef = useRef(false);

  // Load debate config from localStorage
  const [debateConfig, setDebateConfig] = useState<DebateConfig | null>(null);

  const { clearApiKey } = useApiKey();
  const { saveDebate } = useDebates();

  // Load debate config on mount
  useEffect(() => {
    // First, check if this debate is already saved in localStorage
    const savedDebates = localStorage.getItem(STORAGE_KEYS.SAVED_DEBATES);
    if (savedDebates) {
      try {
        const debates: SavedDebate[] = JSON.parse(savedDebates);
        const savedDebate = debates.find((d) => d.debateId === debateId);

        if (savedDebate?.debateRounds && savedDebate.debateRounds.length > 0) {
          // Load saved debate data
          const savedTitle = savedDebate.topic || "Debate Chat";
          setDisplayTopic(cleanString(savedTitle));
          setYesModel(savedDebate.yesModel || "");
          setNoModel(savedDebate.noModel || "");
          setOpeningStatements(savedDebate.openingStatements || null);
          setDebateRounds(savedDebate.debateRounds || []);
          setConclusions(savedDebate.conclusions || null);
          setJudgeEvaluations(savedDebate.judgeEvaluations || []);
          setFinalResult(savedDebate.finalResult || null);
          setUsage(savedDebate.usage);
          setIsComplete(true);
          setStatus("Debate loaded from saved data");
          return; // Don't start a new debate
        }
      } catch (e) {
        console.error("Error loading saved debate:", e);
      }
    }

    // Try to load config from pending debates (new debates)
    const pendingDebates = localStorage.getItem(STORAGE_KEYS.PENDING_DEBATES);

    if (!pendingDebates) {
      console.error("No pending debates found in localStorage for debateId:", debateId);
      setError("Missing required debate parameters. Please start a new debate from the home page.");
      return;
    }

    try {
      const pending = JSON.parse(pendingDebates);
      const config = pending[debateId] || null;

      if (!config) {
        console.error("No config found for debateId:", debateId);
        setError(
          "Missing required debate parameters. Please start a new debate from the home page."
        );
        return;
      }

      if (!config.topic || !config.yesModel || !config.noModel) {
        console.error("Invalid config found - missing required fields:", {
          hasTopic: !!config.topic,
          hasYesModel: !!config.yesModel,
          hasNoModel: !!config.noModel,
          config,
        });
        setError(
          "Missing required debate parameters. Please start a new debate from the home page."
        );
        return;
      }

      // Set the config - don't delete from localStorage yet
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
      console.error("Error loading pending debate config:", e);
      setError("Error loading debate configuration. Please try starting a new debate.");
    }
  }, [debateId]);

  // Start debate when config is loaded
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally excluding navigate, clearApiKey, and debateId to prevent duplicate debate starts. These are stable references that don't need to trigger re-runs.
  useEffect(() => {
    // Prevent duplicate execution in React Strict Mode
    if (hasStartedRef.current || !debateConfig || isComplete) {
      return;
    }

    // Validate config before starting
    if (!debateConfig.topic || !debateConfig.yesModel || !debateConfig.noModel) {
      console.error("Invalid debate config:", debateConfig);
      setError("Missing required debate parameters. Please start a new debate from the home page.");
      return;
    }

    hasStartedRef.current = true;

    // Get API key from localStorage
    const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);

    if (!storedApiKey || !storedApiKey.trim()) {
      setError("OpenRouter API key is required. Please go back and enter your API key.");
      // Redirect to homepage after a delay
      setTimeout(() => {
        navigate({ to: "/" });
      }, TIMING.REDIRECT_DELAY);
      return;
    }

    const apiKey = storedApiKey.trim();

    // Create AbortController for cleanup
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    // Helper function for retry logic with exponential backoff
    const fetchWithRetry = async (
      url: string,
      options: RequestInit,
      retries = TIMING.MAX_RETRY_ATTEMPTS
    ): Promise<Response> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(url, options);
          if (response.ok || attempt === retries - 1) {
            return response;
          }
          // Only retry on network errors or 5xx errors
          if (response.status >= 500 || response.status === 0) {
            const delay = TIMING.RETRY_BASE_DELAY * 2 ** attempt;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          return response;
        } catch (error) {
          if (attempt === retries - 1) throw error;
          const delay = TIMING.RETRY_BASE_DELAY * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      throw new Error("Max retries exceeded");
    };

    // Generate title first, then start debate
    const generateTitleAndStartDebate = async () => {
      const { topic, yesModel, noModel, rounds, judgePrompt } = debateConfig;

      // Clean up pending debate entry once we start
      const pendingDebates = localStorage.getItem(STORAGE_KEYS.PENDING_DEBATES);
      if (pendingDebates) {
        try {
          const pending = JSON.parse(pendingDebates);
          delete pending[debateId];
          localStorage.setItem(STORAGE_KEYS.PENDING_DEBATES, JSON.stringify(pending));
        } catch (e) {
          console.error("Error cleaning up pending debate:", e);
        }
      }

      try {
        // Step 1: Generate title
        setStatus("Generating title...");
        let generatedTitle: string | null = null;
        try {
          const titleResponse = await fetchWithRetry(
            `${getApiBaseUrl()}/api/debate/generate-title`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                topic,
                api_key: apiKey,
              }),
              signal: abortController.signal,
            }
          );

          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            if (titleData.title) {
              // Clean the title before displaying
              const cleanedTitle = cleanString(titleData.title);
              generatedTitle = cleanedTitle;
              setDisplayTopic(cleanedTitle);
              setStatus("Title generated. Starting debate...");
            }
          } else {
            // If title generation fails, use a fallback title
            console.warn("Title generation failed, using fallback");
            const fallbackTitle = topic.split("\n")[0].substring(0, 80).trim();
            generatedTitle = fallbackTitle.endsWith("...") ? fallbackTitle : `${fallbackTitle}...`;
            setDisplayTopic(generatedTitle);
            setStatus("Starting debate...");
          }
        } catch (titleError) {
          // Check if aborted
          if (abortController.signal.aborted) {
            return;
          }
          // If title generation fails, use a fallback title and continue
          console.warn("Title generation error:", titleError);
          const fallbackTitle = topic.split("\n")[0].substring(0, 80).trim();
          generatedTitle = fallbackTitle.endsWith("...") ? fallbackTitle : `${fallbackTitle}...`;
          setDisplayTopic(generatedTitle);
          setStatus("Starting debate...");
        }

        // Step 2: Start debate with SSE streaming (using the generated title)
        const response = await fetchWithRetry(`${getApiBaseUrl()}/api/debate/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            yesModel,
            noModel,
            rounds: parseInt(rounds || "3", 10),
            judgePrompt: judgePrompt || "",
            title: generatedTitle, // Send the generated title to avoid duplicate generation
            api_key: apiKey,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          let errorText = "";
          try {
            errorText = await response.text();
          } catch {
            errorText = "Unknown error";
          }

          let errorMessage = `HTTP error! status: ${response.status}`;

          // Check for API key related errors
          if (
            response.status === 401 ||
            response.status === 403 ||
            errorText.includes("API key") ||
            errorText.includes("OpenRouter") ||
            errorText.includes("authentication") ||
            errorText.includes("unauthorized")
          ) {
            errorMessage = `Authentication error: Invalid or missing API key. Please check your API key.`;
            clearApiKey();
          } else if (errorText) {
            errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`;
          }

          throw new Error(errorMessage);
        }

        reader = response.body?.getReader() || null;
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let buffer = "";

        try {
          while (true) {
            // Check if aborted
            if (abortController.signal.aborted) {
              break;
            }

            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handleSSEEvent(data);
                } catch (e) {
                  console.error("Error parsing SSE data:", e);
                }
              }
            }
          }
        } finally {
          // Clean up reader
          try {
            reader.cancel();
          } catch {
            // Ignore cancellation errors
          }
          reader = null;
        }
      } catch (err: unknown) {
        // Check if aborted - don't set error if user navigated away
        if (abortController.signal.aborted) {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : "Failed to start debate";
        setError(errorMessage);
        console.error("Debate error:", err);

        // Clear API key on OpenRouter errors
        if (
          errorMessage.includes("OpenRouter") ||
          errorMessage.includes("API key") ||
          errorMessage.includes("401") ||
          errorMessage.includes("403")
        ) {
          clearApiKey();
        }
      }
    };

    const handleSSEEvent = (data: SSEEventData) => {
      switch (data.stage) {
        case "stream_start":
          setStatus("Stream initialized...");
          break;
        case "opening_statements_start":
          setStatus(data.message || "Generating opening statements...");
          break;
        case "opening_statements_complete":
          if (data.data && "yesStatement" in data.data && "noStatement" in data.data) {
            setOpeningStatements(data.data as OpeningStatements);
          }
          setStatus("Opening statements complete");
          break;
        case "rebuttals_start":
          setStatus(data.message || "Starting rebuttal rounds...");
          break;
        case "rebuttal_round_start":
          if (data.data && "round" in data.data && typeof data.data.round === "number") {
            setStatus(data.message || `Starting rebuttal round ${data.data.round}...`);
          } else {
            setStatus(data.message || "Starting rebuttal round...");
          }
          break;
        case "rebuttal_round_complete":
          if (
            data.data &&
            "round" in data.data &&
            "yesMessage" in data.data &&
            "noMessage" in data.data
          ) {
            setDebateRounds((prev) => [...prev, data.data as DebateRound]);
            const roundData = data.data as DebateRound;
            setStatus(`Rebuttal round ${roundData.round} complete`);
          }
          break;
        case "rebuttals_complete":
          setStatus("All rebuttal rounds complete");
          break;
        case "conclusions_start":
          setStatus(data.message || "Generating conclusions...");
          break;
        case "conclusions_complete":
          if (data.data && "yesConclusion" in data.data && "noConclusion" in data.data) {
            setConclusions(data.data as Conclusions);
          }
          setStatus("Conclusions complete");
          break;
        case "judging_start":
          setStatus("Judges evaluating debate...");
          break;
        case "judging_progress":
          setStatus(data.message || "Judges evaluating...");
          break;
        case "judge_complete":
          if (data.data && "judgeModel" in data.data && "evaluation" in data.data) {
            setJudgeEvaluations((prev) => [...prev, data.data as JudgeEvaluation]);
            const judgeData = data.data as JudgeEvaluation;
            setStatus(`Judge ${judgeData.judgeModel} evaluation complete`);
          }
          break;
        case "judging_complete":
          if (
            data.data &&
            "finalResult" in data.data &&
            data.data.finalResult &&
            typeof data.data.finalResult === "object"
          ) {
            setFinalResult(data.data.finalResult as FinalResult);
            setStatus("All evaluations complete");
          }
          break;
        case "complete":
          setIsComplete(true);
          setStatus("Debate process complete!");
          // Load all data from the complete event
          if (data.data && typeof data.data === "object") {
            const completeData = data.data as {
              title?: string;
              yesModel?: string;
              noModel?: string;
              openingStatements?: OpeningStatements;
              rounds?: DebateRound[];
              conclusions?: Conclusions;
              judgeEvaluations?: JudgeEvaluation[];
              finalResult?: FinalResult;
              usage?: UsageData;
            };
            // Save models from complete event
            if (completeData.yesModel) {
              setYesModel(completeData.yesModel);
            }
            if (completeData.noModel) {
              setNoModel(completeData.noModel);
            }
            if (completeData.openingStatements) {
              setOpeningStatements(completeData.openingStatements);
              // Also extract models from opening statements if not already set
              if (!completeData.yesModel && completeData.openingStatements.yesStatement?.model) {
                setYesModel(completeData.openingStatements.yesStatement.model);
              }
              if (!completeData.noModel && completeData.openingStatements.noStatement?.model) {
                setNoModel(completeData.openingStatements.noStatement.model);
              }
            }
            if (completeData.rounds && Array.isArray(completeData.rounds)) {
              setDebateRounds(completeData.rounds);
            }
            if (completeData.conclusions) {
              setConclusions(completeData.conclusions);
              // Also extract models from conclusions if not already set
              if (!completeData.yesModel && completeData.conclusions.yesConclusion?.model) {
                setYesModel(completeData.conclusions.yesConclusion.model);
              }
              if (!completeData.noModel && completeData.conclusions.noConclusion?.model) {
                setNoModel(completeData.conclusions.noConclusion.model);
              }
            }
            if (completeData.judgeEvaluations) {
              setJudgeEvaluations(completeData.judgeEvaluations);
            }
            if (completeData.finalResult) {
              setFinalResult(completeData.finalResult);
            }
            if (completeData.title) {
              setDisplayTopic(cleanString(completeData.title));
            }
            if (completeData.usage) {
              setUsage(completeData.usage);
            }
          }
          break;
        case "status_update":
          // Handle real-time status updates
          if (data.message) {
            setStatus(data.message);
          }
          break;
        case "error": {
          const errorMessage = data.message || "An error occurred";
          setError(errorMessage);
          setStatus(`Error: ${errorMessage}`);

          // Clear API key on OpenRouter errors (including 402 credit errors)
          if (
            errorMessage.includes("OpenRouter") ||
            errorMessage.includes("API key") ||
            errorMessage.includes("401") ||
            errorMessage.includes("402") ||
            errorMessage.includes("403") ||
            errorMessage.includes("credits") ||
            errorMessage.includes("insufficient")
          ) {
            clearApiKey();
          }
          break;
        }
      }
    };

    generateTitleAndStartDebate();

    // Cleanup: abort any ongoing requests when component unmounts
    return () => {
      abortController.abort();
      // Clean up reader if it exists
      if (reader) {
        try {
          reader.cancel();
        } catch {
          // Ignore cancellation errors
        }
      }
      // Note: We don't reset hasStartedRef here to prevent duplicate starts
      // The ref persists for the lifetime of the component instance
    };
  }, [debateConfig, isComplete]);

  // Save debate to localStorage when complete
  useEffect(() => {
    if (isComplete && (debateRounds.length > 0 || openingStatements || conclusions)) {
      // Determine models from multiple sources (priority: state > opening statements > conclusions > debateConfig)
      const determinedYesModel =
        yesModel ||
        openingStatements?.yesStatement?.model ||
        conclusions?.yesConclusion?.model ||
        debateConfig?.yesModel ||
        "";
      const determinedNoModel =
        noModel ||
        openingStatements?.noStatement?.model ||
        conclusions?.noConclusion?.model ||
        debateConfig?.noModel ||
        "";

      const savedDebate: SavedDebate = {
        debateId,
        topic: displayTopic || debateConfig?.topic || "",
        yesModel: determinedYesModel,
        noModel: determinedNoModel,
        rounds: debateConfig?.rounds || "3",
        judgePrompt: debateConfig?.judgePrompt || "",
        openingStatements: openingStatements || undefined,
        debateRounds,
        conclusions: conclusions || undefined,
        judgeEvaluations,
        finalResult: finalResult || null,
        usage: usage,
        timestamp: new Date().toISOString(),
      };

      saveDebate(savedDebate);
    }
  }, [
    isComplete,
    debateId,
    displayTopic,
    debateConfig,
    yesModel,
    noModel,
    openingStatements,
    debateRounds,
    conclusions,
    judgeEvaluations,
    finalResult,
    usage,
    saveDebate,
  ]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <div className="w-full">
        <Card className="w-full">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-foreground leading-tight">
                {displayTopic}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {error && (
                <div className="p-5 bg-destructive/10 border-2 border-destructive/30 text-destructive rounded-lg">
                  <div className="font-bold text-lg mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-label="Error icon"
                    >
                      <title>Error</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Error occurred
                  </div>
                  <div className="text-base whitespace-pre-wrap leading-relaxed">{error}</div>
                  {error.includes("credits") || error.includes("402") ? (
                    <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive/90">
                      This appears to be a credit limit issue. Please check your OpenRouter account
                      balance or try a different model.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Debate Content */}
              <DebateContent
                openingStatements={openingStatements}
                debateRounds={debateRounds}
                conclusions={conclusions}
                status={status}
                error={error}
              />

              {/* Judge Evaluations */}
              {judgeEvaluations.length > 0 && (
                <div className="space-y-6 mt-8">
                  <h3 className="text-2xl font-bold text-foreground mb-6">Judge Evaluations</h3>
                  {judgeEvaluations.map((eval_) => (
                    <JudgeEvaluationCard key={eval_.judgeModel} evaluation={eval_} />
                  ))}
                </div>
              )}

              {/* Final Result */}
              {finalResult && <FinalResultCard finalResult={finalResult} />}

              {/* Usage Statistics */}
              {usage && isComplete && <UsageStatsCard usage={usage} />}

              {isComplete && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => {
                      navigate({ to: "/" });
                    }}
                    variant="primary"
                    className="px-8 py-3 text-base"
                  >
                    Start New Debate
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/debate/$debateId")({
  component: DebateComponent,
});
