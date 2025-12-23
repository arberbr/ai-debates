import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApiKey } from "@/hooks/useApiKey";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEBATE_CONFIG, MODEL_OPTIONS, STORAGE_KEYS, TIMING } from "@/lib/constants";

function IndexComponent() {
  const navigate = useNavigate();
  const { apiKey, showApiKeyField, setShowApiKeyField, updateApiKey, saveApiKey, hasApiKey } =
    useApiKey();
  const [isCardUnmounting, setIsCardUnmounting] = useState(false);
  const { getItemRaw, setItem, getItem } = useLocalStorage();

  const handleApiKeyChange = (value: string) => {
    updateApiKey(value);
  };

  const handleApiKeyBlur = (value: string) => {
    saveApiKey(value);
    if (value.trim()) {
      // Show toast
      toast.success("API key saved successfully!");
      // Start unmounting animation
      setIsCardUnmounting(true);
      // Hide card after animation completes
      setTimeout(() => {
        setShowApiKeyField(false);
        setIsCardUnmounting(false);
      }, TIMING.CARD_UNMOUNT_DURATION);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    topic?: string;
    yesModel?: string;
    noModel?: string;
  }>({});

  // Rate limiting: track last submission time to prevent spamming
  const RATE_LIMIT_MS = 5000; // 5 seconds between submissions
  const lastSubmissionRef = useRef<number>(0);

  const form = useForm({
    defaultValues: {
      topic: "",
      yesModel: "",
      noModel: "",
      rounds: 3,
      judgePrompt: "",
    },
    onSubmit: async ({ value }) => {
      // Rate limit check to prevent API quota exhaustion
      const now = Date.now();
      const timeSinceLastSubmission = now - lastSubmissionRef.current;
      if (timeSinceLastSubmission < RATE_LIMIT_MS) {
        const waitTime = Math.ceil((RATE_LIMIT_MS - timeSinceLastSubmission) / 1000);
        toast.error(
          `Please wait ${waitTime} second${waitTime !== 1 ? "s" : ""} before starting another debate`
        );
        return;
      }

      setIsSubmitting(true);
      setFieldErrors({});

      try {
        // Validate required fields - trim to handle whitespace
        let topic = value.topic?.trim() || "";
        const yesModel = value.yesModel?.trim() || "";
        const noModel = value.noModel?.trim() || "";

        // Sanitize topic input before API call
        topic = topic
          .replace(/[<>]/g, "") // Remove potential HTML
          .substring(0, DEBATE_CONFIG.MAX_TOPIC_LENGTH)
          .trim();

        const errors: typeof fieldErrors = {};

        if (!topic) {
          errors.topic = "Debate topic is required";
        } else if (topic.length > DEBATE_CONFIG.MAX_TOPIC_LENGTH) {
          errors.topic = `Topic must be ${DEBATE_CONFIG.MAX_TOPIC_LENGTH} characters or less`;
        }

        if (!yesModel) {
          errors.yesModel = "Please select a model for the Yes side";
        }

        if (!noModel) {
          errors.noModel = "Please select a model for the No side";
        }

        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          toast.error("Please fix the errors in the form");
          return;
        }

        // Validate API key
        const currentApiKey = getItemRaw(STORAGE_KEYS.API_KEY);
        if (!currentApiKey || !currentApiKey.trim()) {
          toast.error("Please enter your OpenRouter API key");
          setShowApiKeyField(true);
          setIsSubmitting(false);
          return;
        }

        // Generate a UUID for the debate
        const debateId = crypto.randomUUID();

        // Save debate config to localStorage before navigating
        const debateConfig = {
          debateId,
          topic,
          yesModel,
          noModel,
          rounds: value.rounds.toString(),
          judgePrompt: value.judgePrompt?.trim() || "",
          timestamp: new Date().toISOString(),
        };

        // Store in a temporary key that will be used when the debate page loads
        try {
          const pendingDebates = getItem<Record<string, typeof debateConfig>>(
            STORAGE_KEYS.PENDING_DEBATES,
            {}
          );
          const updated = { ...pendingDebates, [debateId]: debateConfig };
          setItem(STORAGE_KEYS.PENDING_DEBATES, updated);
        } catch (e) {
          if (e instanceof Error && e.name === "QuotaExceededError") {
            toast.error("Storage limit reached. Please delete some debates to free up space.");
            return;
          }
          throw e;
        }

        // Verify it was saved
        const verify =
          getItem<Record<string, typeof debateConfig>>(STORAGE_KEYS.PENDING_DEBATES, {}) ?? {};
        if (!verify[debateId]) {
          console.error("Failed to save debate config to localStorage");
          toast.error("Failed to save debate configuration. Please try again.");
          return;
        }

        // Update last submission time on successful submission
        lastSubmissionRef.current = Date.now();

        // Navigate to the debate page with just the debateId
        navigate({
          to: "/debate/$debateId",
          params: { debateId },
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <div className="flex flex-col items-center gap-4 w-full">
        <form
          className="w-full flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          {showApiKeyField && (
            <Card
              className={`w-full transition-all duration-300 ${
                isCardUnmounting
                  ? "opacity-0 -translate-y-4 pointer-events-none"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <CardHeader>
                <CardTitle>OpenRouter API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    className="w-full"
                    placeholder="Enter your OpenRouter API key"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    onBlur={(e) => handleApiKeyBlur(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your API key is stored locally and will be used for all debate requests.
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Your API key is stored in your browser's local storage. Only use this on
                    trusted devices.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Debate Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field name="topic">
                {(field) => {
                  const topicValue = field.state.value || "";
                  const charCount = topicValue.length;
                  const maxChars = DEBATE_CONFIG.MAX_TOPIC_LENGTH;
                  const isOverLimit = charCount > maxChars;
                  const hasError = !!fieldErrors.topic || isOverLimit;
                  const errorId = "topic-error";
                  const countId = "topic-count";
                  const describedBy = hasError ? `${errorId} ${countId}` : countId;

                  return (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="debate-topic">Debate Topic</Label>
                      <Textarea
                        id="debate-topic"
                        aria-label="Debate topic"
                        aria-describedby={describedBy}
                        aria-invalid={hasError}
                        aria-errormessage={hasError ? errorId : undefined}
                        className={`w-full ${hasError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : ""}`}
                        placeholder={`Enter the debate topic (max ${DEBATE_CONFIG.MAX_TOPIC_LENGTH} characters)`}
                        rows={4}
                        value={field.state.value}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.handleChange(value);
                          // Clear error when user starts typing
                          if (fieldErrors.topic) {
                            setFieldErrors((prev) => ({ ...prev, topic: undefined }));
                          }
                        }}
                        onBlur={field.handleBlur}
                      />
                      <div
                        id={countId}
                        className="text-sm text-muted-foreground"
                        aria-live="polite"
                      >
                        {charCount} / {maxChars} characters
                      </div>
                      {hasError && (
                        <div
                          id={errorId}
                          className="text-sm text-red-600 dark:text-red-400 font-semibold"
                          role="alert"
                          aria-live="assertive"
                        >
                          {fieldErrors.topic ||
                            `Topic is too long. Please shorten it to ${DEBATE_CONFIG.MAX_TOPIC_LENGTH} characters or less.`}
                        </div>
                      )}
                    </div>
                  );
                }}
              </form.Field>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Select models for each side</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 w-full flex-wrap">
                <form.Field name="yesModel">
                  {(field) => {
                    const hasError = !!fieldErrors.yesModel;
                    const errorId = "yes-model-error";

                    return (
                      <div className="flex-1 flex flex-col gap-3 min-w-[200px]">
                        <Label htmlFor="yes-model">Model for Yes Side</Label>
                        <Select
                          value={field.state.value || ""}
                          onValueChange={(value) => {
                            field.handleChange(value);
                            field.handleBlur();
                            // Clear error when user selects a model
                            if (fieldErrors.yesModel) {
                              setFieldErrors((prev) => ({ ...prev, yesModel: undefined }));
                            }
                          }}
                        >
                          <SelectTrigger
                            id="yes-model"
                            aria-label="Select model for Yes side"
                            aria-describedby={hasError ? errorId : undefined}
                            aria-invalid={hasError}
                            aria-errormessage={hasError ? errorId : undefined}
                            className={`w-full ${hasError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : ""}`}
                          >
                            <SelectValue placeholder="Select model for Yes" />
                          </SelectTrigger>
                          <SelectContent>
                            {MODEL_OPTIONS.map((model) => (
                              <SelectItem key={`yes-${model.slug}`} value={model.slug}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {hasError && (
                          <div
                            id={errorId}
                            className="text-sm text-red-600 dark:text-red-400 font-semibold"
                            role="alert"
                            aria-live="assertive"
                          >
                            {fieldErrors.yesModel}
                          </div>
                        )}
                      </div>
                    );
                  }}
                </form.Field>

                <form.Field name="noModel">
                  {(field) => {
                    const hasError = !!fieldErrors.noModel;
                    const errorId = "no-model-error";

                    return (
                      <div className="flex-1 flex flex-col gap-3 min-w-[200px]">
                        <Label htmlFor="no-model">Model for No Side</Label>
                        <Select
                          value={field.state.value || ""}
                          onValueChange={(value) => {
                            field.handleChange(value);
                            field.handleBlur();
                            // Clear error when user selects a model
                            if (fieldErrors.noModel) {
                              setFieldErrors((prev) => ({ ...prev, noModel: undefined }));
                            }
                          }}
                        >
                          <SelectTrigger
                            id="no-model"
                            aria-label="Select model for No side"
                            aria-describedby={hasError ? errorId : undefined}
                            aria-invalid={hasError}
                            aria-errormessage={hasError ? errorId : undefined}
                            className={`w-full ${hasError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : ""}`}
                          >
                            <SelectValue placeholder="Select model for No" />
                          </SelectTrigger>
                          <SelectContent>
                            {MODEL_OPTIONS.map((model) => (
                              <SelectItem key={`no-${model.slug}`} value={model.slug}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {hasError && (
                          <div
                            id={errorId}
                            className="text-sm text-red-600 dark:text-red-400 font-semibold"
                            role="alert"
                            aria-live="assertive"
                          >
                            {fieldErrors.noModel}
                          </div>
                        )}
                      </div>
                    );
                  }}
                </form.Field>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Rounds of rebuttals</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field name="rounds">
                {(field) => {
                  const roundsValue = field.state.value || 3;
                  const isOverRecommended = roundsValue > 3;

                  return (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="rounds">Number of Rounds</Label>
                      <Input
                        id="rounds"
                        type="number"
                        aria-label="Number of debate rounds"
                        aria-describedby={isOverRecommended ? "rounds-warning" : undefined}
                        min={DEBATE_CONFIG.MIN_ROUNDS.toString()}
                        max={DEBATE_CONFIG.MAX_ROUNDS.toString()}
                        step="1"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        onBlur={field.handleBlur}
                        placeholder="e.g., 3"
                        className="w-full"
                      />
                      {isOverRecommended && (
                        <p
                          id="rounds-warning"
                          className="text-sm text-amber-700 dark:text-amber-400 font-semibold"
                          aria-live="polite"
                        >
                          ⚠️ Warning: More than 3 rounds may significantly increase token usage and
                          costs.
                        </p>
                      )}
                    </div>
                  );
                }}
              </form.Field>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Judge system prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field name="judgePrompt">
                {(field) => (
                  <div className="flex flex-col gap-3">
                    <Textarea
                      id="judge-prompt"
                      aria-label="Judge system prompt"
                      placeholder="Describe how judges should evaluate the debate (e.g., reasoning quality, evidence, factual accuracy, conciseness)"
                      rows={4}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full min-h-[120px]"
                    />
                  </div>
                )}
              </form.Field>
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="primary"
            disabled={(!hasApiKey && !apiKey.trim()) || isSubmitting}
            className="mt-2 px-7 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Starting Debate..." : "Start Debate"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: IndexComponent,
});
