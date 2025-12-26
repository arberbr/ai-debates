import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_OPTIONS } from "@/lib/constants";
import type { FormFieldApi, FormWithField } from "@/lib/form-types";
import { FormErrorMessage } from "./FormErrorMessage";

export interface ModelSelectProps {
  /** Form instance from TanStack Form */
  form: FormWithField;
  /** Field name ('yesModel' or 'noModel') */
  fieldName: "yesModel" | "noModel";
  /** Field label text */
  label: string;
  /** Placeholder text */
  placeholder: string;
  /** Error message for this field */
  error?: string;
  /** Callback to clear field error */
  onErrorClear?: () => void;
  /** HTML id for the select element */
  selectId: string;
  /** HTML id for the error message element */
  errorId: string;
  /** HTML id for the description element */
  descriptionId: string;
  /** Description text for screen readers */
  descriptionText: string;
}

/**
 * Reusable model selection component for debate form
 */
export function ModelSelect({
  form,
  fieldName,
  label,
  placeholder,
  error,
  onErrorClear,
  selectId,
  errorId,
  descriptionId,
  descriptionText,
}: ModelSelectProps) {
  const hasError = !!error;

  return (
    <form.Field name={fieldName}>
      {(field) => {
        const typedField = field as FormFieldApi<string>;
        return (
          <div className="flex-1 flex flex-col gap-3 min-w-[200px]">
            <Label htmlFor={selectId}>{label}</Label>
            <Select
              value={typedField.state.value || ""}
              onValueChange={(value) => {
                typedField.handleChange(value);
                typedField.handleBlur();
                onErrorClear?.();
              }}
            >
              <SelectTrigger
                id={selectId}
                aria-label={label}
                aria-describedby={hasError ? errorId : descriptionId}
                aria-invalid={hasError}
                aria-errormessage={hasError ? errorId : undefined}
                className={`w-full ${hasError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : ""}`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <div id={descriptionId} className="sr-only">
                {descriptionText}
              </div>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={`${fieldName}-${model.slug}`} value={model.slug}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormErrorMessage id={errorId} error={error} />
          </div>
        );
      }}
    </form.Field>
  );
}
