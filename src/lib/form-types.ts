/**
 * Type definitions for debate form data
 */

export interface DebateFormData {
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: number;
  judgePrompt: string;
}

/**
 * Type-safe interface for TanStack Form field API
 * This abstracts the complex generic types while maintaining type safety for the properties we use
 */
export interface FormFieldApi<TValue = unknown> {
  state: {
    value: TValue;
  };
  handleChange: (value: TValue | ((prev: TValue) => TValue)) => void;
  handleBlur: () => void;
}
