import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { ApiKeyCard } from "@/components/form/ApiKeyCard";
import { DebateTopicField } from "@/components/form/DebateTopicField";
import { ModelSelect } from "@/components/form/ModelSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApiKey } from "@/hooks/useApiKey";
import { useDebateFormSubmission } from "@/hooks/useDebateFormSubmission";
import { DEBATE_CONFIG } from "@/lib/constants";
import type { FormWithField } from "@/lib/form-types";

function IndexComponent() {
  const { apiKey, showApiKeyField, setShowApiKeyField, updateApiKey, saveApiKey, hasApiKey } =
    useApiKey();

  const { handleSubmit, isSubmitting, fieldErrors, setFieldErrors } = useDebateFormSubmission({
    setShowApiKeyField,
  });

  const form = useForm({
    defaultValues: {
      topic: "",
      yesModel: "",
      noModel: "",
      rounds: 3,
      judgePrompt: "",
    },
    onSubmit: async ({ value }) => {
      await handleSubmit({
        topic: value.topic,
        yesModel: value.yesModel,
        noModel: value.noModel,
        rounds: value.rounds,
        judgePrompt: value.judgePrompt,
      });
    },
  });

  return (
    <div className="flex flex-col items-center justify-start p-8 bg-background">
      <div className="flex flex-col items-center gap-4 w-full">
        <form
          className="w-full flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <ApiKeyCard
            apiKey={apiKey}
            isVisible={showApiKeyField}
            onApiKeyChange={updateApiKey}
            onApiKeySave={saveApiKey}
            onHide={() => setShowApiKeyField(false)}
          />

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Debate Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <DebateTopicField
                form={form as FormWithField}
                fieldError={fieldErrors.topic}
                onErrorClear={() => setFieldErrors((prev) => ({ ...prev, topic: undefined }))}
              />
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Select models for each side</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 w-full flex-wrap">
                <ModelSelect
                  form={form as FormWithField}
                  fieldName="yesModel"
                  label="Model for Yes Side"
                  placeholder="Select model for Yes"
                  error={fieldErrors.yesModel}
                  onErrorClear={() => setFieldErrors((prev) => ({ ...prev, yesModel: undefined }))}
                  selectId="yes-model"
                  errorId="yes-model-error"
                  descriptionId="yes-model-desc"
                  descriptionText="Choose the AI model that will argue in favor of the topic."
                />
                <ModelSelect
                  form={form as FormWithField}
                  fieldName="noModel"
                  label="Model for No Side"
                  placeholder="Select model for No"
                  error={fieldErrors.noModel}
                  onErrorClear={() => setFieldErrors((prev) => ({ ...prev, noModel: undefined }))}
                  selectId="no-model"
                  errorId="no-model-error"
                  descriptionId="no-model-desc"
                  descriptionText="Choose the AI model that will argue against the topic."
                />
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
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (
                            Number.isInteger(value) &&
                            value >= DEBATE_CONFIG.MIN_ROUNDS &&
                            value <= DEBATE_CONFIG.MAX_ROUNDS
                          ) {
                            field.handleChange(value);
                          }
                        }}
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
