import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEBATE_CONFIG } from "@/lib/constants";
import type { FormFieldApi } from "@/lib/form-types";
import { FormErrorMessage } from "./FormErrorMessage";

export interface DebateTopicFieldProps {
  /** Form instance from TanStack Form */
  // Using a permissive type to accept TanStack Form's complex generic type system
  // The field parameter is properly typed internally via type assertion
  form: {
    Field: (props: {
      name: string;
      children: (field: unknown) => React.ReactNode;
    }) => React.ReactNode;
  };
  /** Field error message */
  fieldError?: string;
  /** Callback to clear field error */
  onErrorClear?: () => void;
}

/**
 * Reusable debate topic textarea field with character counting
 */
export function DebateTopicField({ form, fieldError, onErrorClear }: DebateTopicFieldProps) {
  return (
    <form.Field name="topic">
      {(field: unknown) => {
        // Type assertion to FormFieldApi for type safety in implementation
        const typedField = field as FormFieldApi<string>;
        const topicValue = typedField.state.value || "";
        const charCount = topicValue.length;
        const maxChars = DEBATE_CONFIG.MAX_TOPIC_LENGTH;
        const isOverLimit = charCount > maxChars;
        const hasError = !!fieldError || isOverLimit;
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
              placeholder={`Enter the debate topic (max ${maxChars} characters)`}
              rows={4}
              value={typedField.state.value}
              onChange={(e) => {
                const value = e.target.value;
                typedField.handleChange(value);
                onErrorClear?.();
              }}
              onBlur={typedField.handleBlur}
            />
            <div id={countId} className="text-sm text-muted-foreground" aria-live="polite">
              {charCount} / {maxChars} characters
            </div>
            <FormErrorMessage
              id={errorId}
              error={
                fieldError ||
                (isOverLimit
                  ? `Topic is too long. Please shorten it to ${maxChars} characters or less.`
                  : undefined)
              }
            />
          </div>
        );
      }}
    </form.Field>
  );
}
